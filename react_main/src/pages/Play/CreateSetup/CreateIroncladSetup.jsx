import React, { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

import CreateBrowser from "./CreateBrowser";
import { SiteInfoContext } from "../../../Contexts";
import { useForm } from "../../../components/Form";
import { useErrorAlert } from "../../../components/Alerts";

export default function CreateIroncladSetup() {
  const gameType = "Ironclad";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const errorAlert = useErrorAlert();
  const [formFields, updateFormFields, resetFormFields] = useForm([
    {
      label: "Setup Name",
      ref: "name",
      type: "text",
    },
    {
      label: "Board Size",
      ref: "boardSize",
      type: "number",
      value: "10",
      min: "6",
      max: "14",
    },
    {
      label: "Ship Layout (comma separated lengths)",
      ref: "shipLayout",
      type: "text",
      value: "5,4,3,3,2",
    },
    {
      label: "Placement Length (minutes)",
      ref: "placementLength",
      type: "number",
      value: "5",
      min: "1",
      max: "20",
    },
    {
      label: "Battle Length (minutes)",
      ref: "battleLength",
      type: "number",
      value: "20",
      min: "5",
      max: "120",
    },
  ]);
  const formFieldValueMods = {};

  const siteInfo = useContext(SiteInfoContext);

  useEffect(() => {
    document.title = "Create Ironclad Setup | UltiMafia";
  }, []);

  function onCreateSetup(roleData, editing, setNavigate, gameSettings) {
    axios
      .post("/api/setup/create", {
        gameType,
        roles: roleData.roles,
        gameSettings,
        name: formFields[0].value,
        startState: "Placement",
        whispers: false,
        leakPercentage: 100,
        boardSize: Number(formFields[1].value),
        shipLayout: formFields[2].value,
        stateLengths: {
          Placement: Number(formFields[3].value),
          Battle: Number(formFields[4].value),
        },
        editing,
        id: params.get("edit"),
      })
      .then((res) => {
        siteInfo.showAlert(
          `${editing ? "Edited" : "Created"} setup '${formFields[0].value}'`,
          "success"
        );
        setNavigate(res.data);
      })
      .catch(errorAlert);
  }

  return (
    <CreateBrowser
      gameType={gameType}
      formFields={formFields}
      updateFormFields={updateFormFields}
      resetFormFields={resetFormFields}
      closedField={{ value: false }}
      formFieldValueMods={formFieldValueMods}
      onCreateSetup={onCreateSetup}
    />
  );
}

