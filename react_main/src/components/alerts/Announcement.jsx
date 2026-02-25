import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  getAnnouncement,
  getPrevAnnouncement,
  getNextAnnouncement,
  isFirstAnnouncement,
  isLastAnnouncement,
} from "../../services/announcementService";
import { Loading } from "../Loading";
import { minimumLoadingTime } from "../../Constants";
import { useIsPhoneDevice } from "../../hooks/useIsPhoneDevice";
import { useErrorAlert } from "../Alerts";
import { TextEditor } from "../Form";
import CustomMarkdown from "../CustomMarkdown";
import { SiteInfoContext, UserContext } from "../../Contexts";

export const Announcement = ({
  showAnnouncementTemporarily,
  setShowAnnouncementTemporarily,
}) => {
  const user = useContext(UserContext);
  const siteInfo = useContext(SiteInfoContext);
  const errorAlert = useErrorAlert();
  const [seenAnnouncement, setSeenAnnouncement] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [showPrevButton, setShowPrevButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(true); // BUG: if there's only 1 announcement, NEXT_BUTTON should be disabled
  const [loadingFirstTime, setLoadingFirstTime] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const isPhoneDevice = useIsPhoneDevice();
  const canEdit = user?.perms?.announce;

  useEffect(() => {
    (async () => {
      const firstAnnouncement = await getAnnouncement();
      const lastSeenAnnouncementDate = localStorage.getItem(
        "lastSeenAnnouncementDate"
      );

      setSeenAnnouncement(lastSeenAnnouncementDate == firstAnnouncement?.date);
      setAnnouncement(firstAnnouncement);
      setLoading(false);
      setLoadingFirstTime(false);
    })();
  }, []);

  if (loadingFirstTime) {
    return "";
  }
  if (seenAnnouncement && !showAnnouncementTemporarily) {
    return "";
  }
  if (!announcement) {
    return "";
  }

  const stopLoading = () =>
    setTimeout(() => setLoading(false), minimumLoadingTime);
  const closeAnnouncements = () => {
    localStorage.setItem("lastSeenAnnouncementDate", announcement?.date);
    setSeenAnnouncement(true);
    setShowAnnouncementTemporarily(false);
  };
  const showPrevAnnouncement = async () => {
    setLoading(true);
    const newAnnouncement = await getPrevAnnouncement(announcement?.date);
    const newShowPrevButton = await isFirstAnnouncement(newAnnouncement);

    setShowNextButton(true);
    setShowPrevButton(newShowPrevButton);
    setAnnouncement(newAnnouncement);
    stopLoading();
  };
  const showNextAnnouncement = async () => {
    setLoading(true);
    const newAnnouncement = await getNextAnnouncement(announcement?.date);
    const newShowNextButton = await isLastAnnouncement(newAnnouncement);

    setShowPrevButton(true);
    setShowNextButton(newShowNextButton);
    setAnnouncement(newAnnouncement);
    stopLoading();
  };

  const handleEditClick = () => {
    setEditContent(announcement?.content || "");
    setEditOpen(true);
  };

  const handleEditSave = () => {
    axios
      .put("/api/mod/announcement", {
        id: announcement?.id,
        content: editContent,
      })
      .then(() => {
        setAnnouncement({ ...announcement, content: editContent });
        setEditOpen(false);
        siteInfo?.showAlert?.("Announcement updated.", "success");
      })
      .catch(errorAlert);
  };

  const handleDeleteClick = () => {
    if (!window.confirm("Delete this announcement?")) return;
    axios
      .post("/api/mod/announcement/delete", { id: announcement?.id })
      .then(async () => {
        siteInfo?.showAlert?.("Announcement deleted.", "success");
        const nextAnnouncement = await getNextAnnouncement(announcement?.date);
        const prevAnnouncement = nextAnnouncement
          ? null
          : await getPrevAnnouncement(announcement?.date);
        const newAnnouncement = nextAnnouncement || prevAnnouncement;
        if (newAnnouncement) {
          setAnnouncement(newAnnouncement);
          setShowPrevButton(await isFirstAnnouncement(newAnnouncement));
          setShowNextButton(await isLastAnnouncement(newAnnouncement));
        } else {
          closeAnnouncements();
        }
      })
      .catch(errorAlert);
  };

  const CloseButton = (
    <Box onClick={closeAnnouncements} sx={{ ml: -1, mt: -0.5 }}>
      <IconButton color="info" sx={{ p: 0.5 }}>
        <i className="far fa-times-circle"></i>
      </IconButton>
    </Box>
  );

  // const ScrollButtonsWidth = 35;
  const iconHeight = 15; // default: 20px
  const PrevButton = (
    <IconButton
      disabled={loading || !showPrevButton}
      color="info"
      sx={{ width: `${iconHeight + 8}px`, p: 0.5 }}
      onClick={showPrevAnnouncement}
    >
      <i
        className="fas fa-angle-up"
        style={{ fontSize: `${iconHeight}px` }}
      ></i>
    </IconButton>
  );
  const NextButton = (
    <IconButton
      disabled={loading || !showNextButton}
      color="info"
      sx={{ width: `${iconHeight + 8}px`, p: 0.5 }}
      onClick={showNextAnnouncement}
    >
      <i
        className="fas fa-angle-down"
        style={{ fontSize: `${iconHeight}px` }}
      ></i>
    </IconButton>
  );
  const ScrollButtons = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        mr: 0.5,
        mt: 0.5,
        ml: -4,
        // ml: `-${ScrollButtonsWidth}px`,
      }}
    >
      {PrevButton}
      {NextButton}
    </Box>
  );

  const content = loading ? (
    <div
      style={{
        maxHeight: "20px" /* MAGIC NUMBER WARNING... CSS demands sacrifices */,
      }}
    >
      <Loading extraSmall />
    </div>
  ) : (
    <CustomMarkdown>{announcement?.content || ""}</CustomMarkdown>
  );

  const actionButtons = (
    <Stack direction="row" spacing={0} alignItems="center">
      {canEdit && (
        <>
          <IconButton
            aria-label="edit"
            color="info"
            size="small"
            sx={{ p: 0.5 }}
            onClick={handleEditClick}
          >
            <i className="fas fa-pen-square" />
          </IconButton>
          <IconButton
            aria-label="delete"
            color="info"
            size="small"
            sx={{ p: 0.5 }}
            onClick={handleDeleteClick}
          >
            <i className="fas fa-times-circle" />
          </IconButton>
        </>
      )}
      {CloseButton}
    </Stack>
  );

  return (
    <>
      <Stack direction="row" spacing={1}>
        {ScrollButtons}
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            width: "100%",
            backgroundColor: "background.paper",
          }}
          action={actionButtons}
          icon={<i className="fas fa-bullhorn" />}
        >
        <Box
          sx={{
            width: "100%",
            wordBreak: "break-word",
            cursor: "default",
          }}
        >
          {content}
        </Box>
      </Alert>
    </Stack>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Stack direction="column" spacing={1}>
            <Typography variant="h6">Edit Announcement</Typography>
            <Paper
              sx={{
                p: 1,
                ".react-mde, .mde-header, .mde-text, .mde-preview": {
                  backgroundColor: "unset !important",
                  borderColor: "var(--mui-palette-divider)",
                },
                ".react-mde": {
                  borderRadius: "var(--mui-shape-borderRadius)",
                },
              }}
            >
              <TextEditor value={editContent} onChange={setEditContent} />
            </Paper>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>Save</Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
