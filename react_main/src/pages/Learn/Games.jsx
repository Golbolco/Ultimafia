import React, { useState, useMemo, useEffect, useContext } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Tabs,
  Tab,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from "@mui/material";

import { RoleSearch, ModifierSearch, GameSettingSearch } from "components/Roles";
import { AchievementSearch } from "components/Achievements";
import { ActiveGameTypes, DisabledGameTypes } from "Constants";
import GameIcon from "components/GameIcon";
import { SiteInfoContext } from "Contexts";
import { hyphenDelimit } from "utils";
import { learnGameDescriptionByType } from "../../../../data/descriptions";

const TAB_IDS = ["roles", "modifiers", "items", "mechanics", "achievements"];
const TAB_LABELS = {
  roles: "Roles",
  modifiers: "Modifiers",
  items: "Items",
  mechanics: "Mechanics",
  achievements: "Achievements",
};

function LearnRichDescription({ description }) {
  if (!description?.length) return null;

  return (
    <>
      {description.map((block, idx) => {
        if (block.type === "paragraph") {
          if (block.parts?.length) {
            return (
              <Typography key={idx} variant="body1" paragraph component="div">
                {block.parts.map((part, j) => {
                  if (part.type === "text") {
                    return <React.Fragment key={j}>{part.content}</React.Fragment>;
                  }
                  if (part.type === "link") {
                    return (
                      <Link
                        key={j}
                        href={part.href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {part.label}
                      </Link>
                    );
                  }
                  if (part.type === "routerLink") {
                    return (
                      <Link key={j} component={RouterLink} to={part.to}>
                        {part.label}
                      </Link>
                    );
                  }
                  return null;
                })}
              </Typography>
            );
          }
          return (
            <Typography key={idx} variant="body1" paragraph>
              {block.content}
            </Typography>
          );
        }
        if (block.type === "subheading") {
          return (
            <Typography key={idx} variant="h6" gutterBottom>
              {block.content}
            </Typography>
          );
        }
        if (block.type === "list") {
          return (
            <Box
              key={idx}
              component="ul"
              sx={{
                pl: 3,
                mb: 2,
                "& li": { typography: "body1" },
              }}
            >
              {block.items.map((item, j) => (
                <Box component="li" key={j} sx={{ mb: 0.5 }}>
                  {typeof item === "string" ? (
                    item
                  ) : (
                    <>
                      <Typography component="span" fontWeight="bold">
                        {item.strong}
                      </Typography>
                      {item.text}
                    </>
                  )}
                </Box>
              ))}
            </Box>
          );
        }
        return null;
      })}
    </>
  );
}

function DrawItMechanics() {
  const phases = [
    {
      name: "Pick (5s)",
      text: "The drawer chooses one of two words from the chosen deck. If they don't pick in time, the first option is auto-selected.",
    },
    {
      name: "Draw (30–180s, default 80s)",
      text: "The drawer draws their word on a shared canvas while everyone else types guesses in the common chat. The state ends early once everyone has guessed correctly.",
    },
    {
      name: "Reveal (5s)",
      text: "The word is revealed and points are tallied for the turn before the next drawer is up.",
    },
  ];
  const scoring = [
    {
      name: "Guessers",
      text: "10 / 8 / 6 / 4 / 2 / 1 points by guess order. Sixth and beyond all earn 1 point.",
    },
    {
      name: "Drawer",
      text: "Earns the rounded average of all their guessers' scores this turn — clarity beats difficulty. Zero guessers means zero points.",
    },
    {
      name: "Winner",
      text: "Highest total score across all rounds wins. Ties become co-winners.",
    },
  ];

  return (
    <>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Turn phases
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Phase</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {phases.map((row, index) => (
              <TableRow key={index}>
                <TableCell component="th" scope="row">
                  <Typography fontWeight="medium">{row.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.text}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Scoring
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Who</TableCell>
              <TableCell>Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scoring.map((row, index) => (
              <TableRow key={index}>
                <TableCell component="th" scope="row">
                  <Typography fontWeight="medium">{row.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.text}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Once you've guessed
      </Typography>
      <Typography variant="body2" paragraph>
        Once you guess the word, your subsequent messages stay in the main chat but are only visible
        to the drawer and other correct guessers — so you can chat freely without spoiling the answer
        for the players still guessing.
      </Typography>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Word decks
      </Typography>
      <Typography variant="body2" paragraph>
        Six default decks ship with the game (Items, Fruits &amp; Veggies, Vehicles, Animals, Body
        &amp; Faces, Sports &amp; Games). You can build your own decks of 20–500 single-word nouns
        from the{" "}
        <Link component={RouterLink} to="/play/wordDecks">
          Word Decks page
        </Link>
        .
      </Typography>
    </>
  );
}

function LearnTabsLayout({
  children,
  rolesContent,
  modifiersContent = null,
  itemsContent = null,
  mechanicsContent = null,
  achievementsContent = null,
}) {
  const enabledTabs = useMemo(() => {
    const out = [];
    if (rolesContent != null) out.push("roles");
    if (modifiersContent != null) out.push("modifiers");
    if (itemsContent != null) out.push("items");
    if (mechanicsContent != null) out.push("mechanics");
    if (achievementsContent != null) out.push("achievements");
    return out;
  }, [rolesContent, modifiersContent, itemsContent, mechanicsContent, achievementsContent]);

  const [activeTab, setActiveTab] = useState(() => enabledTabs[0] || "roles");

  useEffect(() => {
    if (enabledTabs.length && !enabledTabs.includes(activeTab)) {
      setActiveTab(enabledTabs[0]);
    }
  }, [enabledTabs, activeTab]);

  const value = enabledTabs.includes(activeTab) ? activeTab : enabledTabs[0] || "roles";
  const handleChange = (_, newValue) => {
    if (enabledTabs.includes(newValue)) setActiveTab(newValue);
  };

  return (
    <div className="learn">
      {children}
      <Box sx={{ mt: 2, mb: 1 }}>
        <Tabs value={value} onChange={handleChange}>
          {TAB_IDS.map((id) => (
            <Tab
              key={id}
              label={TAB_LABELS[id]}
              value={id}
              disabled={!enabledTabs.includes(id)}
              sx={
                !enabledTabs.includes(id)
                  ? { color: "text.disabled", "&.Mui-disabled": { opacity: 0.6 } }
                  : undefined
              }
            />
          ))}
        </Tabs>
      </Box>
      <Box role="tabpanel" hidden={value !== "roles"} id="learn-tab-roles">
        {value === "roles" && rolesContent}
      </Box>
      <Box role="tabpanel" hidden={value !== "modifiers"} id="learn-tab-modifiers">
        {value === "modifiers" && modifiersContent}
      </Box>
      <Box role="tabpanel" hidden={value !== "items"} id="learn-tab-items">
        {value === "items" && itemsContent}
      </Box>
      <Box role="tabpanel" hidden={value !== "mechanics"} id="learn-tab-mechanics">
        {value === "mechanics" && mechanicsContent}
      </Box>
      <Box role="tabpanel" hidden={value !== "achievements"} id="learn-tab-achievements">
        {value === "achievements" && achievementsContent}
      </Box>
    </div>
  );
}

function LearnGamePanel({ gameType, Layout }) {
  const siteInfo = useContext(SiteInfoContext);

  const items = useMemo(() => {
    if (gameType !== "Mafia") return [];
    const gameItems = siteInfo.items?.[gameType] || [];
    return gameItems.map((entry) => {
      const iconName = entry.icon || entry.name;
      const iconClass = `icon item item-${gameType}-${hyphenDelimit(iconName)}`;
      return {
        name: entry.name,
        text: entry.description,
        icon: <div className={iconClass} />,
      };
    });
  }, [siteInfo.items, gameType]);

  useEffect(() => {
    document.title = `Learn ${gameType} | UltiMafia`;
  }, [gameType]);

  const description = learnGameDescriptionByType[gameType] ?? [];

  const renderItemsTable = (data) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((entry, index) => (
            <TableRow key={index}>
              <TableCell>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  {entry.icon}
                  <Typography>{entry.name}</Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{entry.text}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  let layoutProps = {
    rolesContent: <RoleSearch gameType={gameType} />,
  };

  if (gameType === "Mafia") {
    layoutProps = {
      ...layoutProps,
      modifiersContent: <ModifierSearch gameType={gameType} />,
      itemsContent: renderItemsTable(items),
      mechanicsContent: <GameSettingSearch gameType={gameType} curMods={{}} />,
      achievementsContent: (
        <Box sx={{ pt: 2 }}>
          <AchievementSearch />
        </Box>
      ),
    };
  }

  if (gameType === "Draw It") {
    layoutProps = {
      ...layoutProps,
      mechanicsContent: <DrawItMechanics />,
    };
  }

  return (
    <Layout {...layoutProps}>
      <LearnRichDescription description={description} />
    </Layout>
  );
}

export default function Games(props) {
  const defaultGameType = "Mafia";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requestedGameType =
    params.get("game") || localStorage.getItem("gameType") || defaultGameType;
  const [gameType, setGameType] = useState(() => {
    if (DisabledGameTypes.includes(requestedGameType)) return defaultGameType;
    if (!learnGameDescriptionByType[requestedGameType]) return defaultGameType;
    return requestedGameType;
  });

  const panelGameType =
    DisabledGameTypes.includes(gameType) || learnGameDescriptionByType[gameType] == null
      ? defaultGameType
      : gameType;

  useEffect(() => {
    if (panelGameType !== gameType) {
      setGameType(panelGameType);
    }
  }, [panelGameType, gameType]);

  const handleGameChange = (event) => {
    const newValue = event.target.value;
    setGameType(newValue);
    localStorage.setItem("gameType", newValue);
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h2" component="span" gutterBottom={false}>
          Learn
        </Typography>
        <FormControl variant="standard" size="small" sx={{ minWidth: 180 }}>
          <Select
            value={gameType}
            onChange={handleGameChange}
            displayEmpty
            sx={{
              typography: "h2",
              "& .MuiSelect-select": { py: 0.5 },
            }}
            renderValue={(value) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GameIcon gameType={value} size={28} />
                {value}
              </Box>
            )}
          >
            {ActiveGameTypes.map((game) => (
              <MenuItem key={game} value={game}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GameIcon gameType={game} size={24} />
                  {game}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box>
        <LearnGamePanel gameType={panelGameType} Layout={LearnTabsLayout} />
      </Box>
    </>
  );
}
