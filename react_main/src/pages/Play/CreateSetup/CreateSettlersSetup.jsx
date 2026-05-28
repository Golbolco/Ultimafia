import React, { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

import CreateBrowser from "./CreateBrowser";
import { SiteInfoContext } from "../../../Contexts";
import { useForm } from "../../../components/Form";
import { useErrorAlert } from "../../../components/Alerts";

export default function CreateSettlersSetup() {
  const gameType = "Settlers";
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
      label: "Maximum Rounds",
      ref: "maxRounds",
      type: "number",
      value: "40",
      min: "10",
      max: "120",
    },
  ]);
  const formFieldValueMods = {};

  const siteInfo = useContext(SiteInfoContext);

  useEffect(() => {
    document.title = "Create Settlers Setup | UltiMafia";
  }, []);

  function onCreateSetup(roleData, editing, setNavigate, gameSettings) {
    axios
      .post("/api/setup/create", {
        gameType: gameType,
        roles: roleData.roles,
        gameSettings: gameSettings,
        name: formFields[0].value,
        startState: "Initial Placement",
        whispers: false,
        leakPercentage: 100,
        maxRounds: Number(formFields[1].value),
        editing: editing,
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
