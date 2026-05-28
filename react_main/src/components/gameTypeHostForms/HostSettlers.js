import axios from "axios";

import { getDefaults, persistDefaults, sortInitialFormFields } from "./DefaultValues";
import { Lobbies } from "Constants";

export default function HostSettlers() {
  const gameType = "Settlers";
  const defaults = getDefaults(gameType);

  const initialFormFields = [
    {
      label: "Lobby",
      ref: "lobby",
      type: "select",
      value: defaults.lobby,
      options: Lobbies.map((lobby) => ({ label: lobby, value: lobby })),
    },
    {
      label: "Lobby Name",
      ref: "lobbyName",
      type: "text",
      value: defaults.lobbyName,
    },
    {
      label: "Private",
      ref: "private",
      type: "boolean",
      value: defaults.private,
    },
    {
      label: "Allow Guests",
      ref: "guests",
      type: "boolean",
      value: defaults.guests,
    },
    {
      label: "Spectating",
      ref: "spectating",
      type: "boolean",
      value: defaults.spectating,
    },
    {
      label: "Ready Check",
      ref: "readyCheck",
      type: "boolean",
      value: defaults.readyCheck,
    },
    {
      label: "Scheduled",
      ref: "scheduled",
      type: "boolean",
    },
    {
      label: "Start Date",
      ref: "startDate",
      type: "datetime-local",
      showIf: "scheduled",
      value: Date.now() + 6 * 60 * 1000,
      min: Date.now() + 6 * 60 * 1000,
      max: Date.now() + 4 * 7 * 24 * 60 * 60 * 1000,
    },
    {
      label: "Configure Duration",
      ref: "configureDuration",
      type: "boolean",
      value: defaults.configureDuration,
    },
    {
      label: "Initial Placement Length (minutes)",
      ref: "initialPlacementLength",
      type: "number",
      showIf: "configureDuration",
      value: defaults.initialPlacementLength,
      min: 2,
      max: 20,
      step: 1,
    },
    {
      label: "Turn Length (minutes)",
      ref: "turnLength",
      type: "number",
      showIf: "configureDuration",
      value: defaults.turnLength,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
    {
      label: "Max Rounds",
      ref: "maxRounds",
      type: "number",
      value: defaults.maxRounds,
      min: 10,
      max: 120,
      step: 1,
    },
  ];

  sortInitialFormFields(initialFormFields);

  function onHostGame(setupId, getFormFieldValue) {
    const scheduled = getFormFieldValue("scheduled");
    if (setupId) {
      const hostPromise = axios.post("/api/game/host", {
        gameType: gameType,
        setup: setupId,
        lobby: getFormFieldValue("lobby"),
        lobbyName: getFormFieldValue("lobbyName"),
        private: getFormFieldValue("private"),
        guests: getFormFieldValue("guests"),
        spectating: getFormFieldValue("spectating"),
        scheduled: scheduled && new Date(getFormFieldValue("startDate")).getTime(),
        readyCheck: getFormFieldValue("readyCheck"),
        stateLengths: {
          "Initial Placement": getFormFieldValue("initialPlacementLength"),
          Turn: getFormFieldValue("turnLength"),
        },
        maxRounds: getFormFieldValue("maxRounds"),
        anonymousGame: getFormFieldValue("anonymousGame"),
        anonymousDeckId: getFormFieldValue("anonymousDeckId"),
      });

      Object.keys(defaults).forEach(function (key) {
        const submittedValue = getFormFieldValue(key);
        if (submittedValue !== undefined && submittedValue !== null) {
          defaults[key] = submittedValue;
        }
      });
      persistDefaults(gameType, defaults);
      return hostPromise;
    }
    return null;
  }

  return [initialFormFields, onHostGame];
}
