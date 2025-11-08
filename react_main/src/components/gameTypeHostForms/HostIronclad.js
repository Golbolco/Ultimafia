import axios from "axios";

import { getDefaults, persistDefaults } from "./DefaultValues";
import { Lobbies } from "Constants";

export default function HostIronclad() {
  const gameType = "Ironclad";
  const defaults = getDefaults(gameType);

  let defaultLobby = localStorage.getItem("lobby");
  if (
    defaultLobby === "All" ||
    defaultLobby === "Main" ||
    defaultLobby === "Competitive"
  ) {
    defaultLobby = "Games";
  }

  const initialFormFields = [
    {
      label: "Board Size",
      ref: "boardSize",
      type: "number",
      min: 6,
      max: 14,
      value: defaults.boardSize,
    },
    {
      label: "Ship Layout (comma separated lengths)",
      ref: "shipLayout",
      type: "text",
      value: defaults.shipLayout,
    },
    {
      label: "Lobby",
      ref: "lobby",
      type: "select",
      value: defaultLobby,
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
      label: "Anonymous Game",
      ref: "anonymousGame",
      type: "boolean",
      value: defaults.anonymousGame,
    },
    {
      label: "Deck ID",
      ref: "anonymousDeckId",
      type: "text",
      value: defaults.anonymousDeckId,
      showIf: "anonymousGame",
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
      label: "Scheduled",
      ref: "scheduled",
      type: "boolean",
    },
    {
      label: "Ready Check",
      ref: "readyCheck",
      type: "boolean",
      value: defaults.readyCheck,
    },
    {
      label: "Start Date",
      ref: "startDate",
      type: "datetime-local",
      showIf: "scheduled",
      min: Date.now(),
    },
    {
      label: "Placement Length (minutes)",
      ref: "placementLength",
      type: "number",
      min: 1,
      max: 20,
      value: defaults.placementLength,
    },
    {
      label: "Battle Length (minutes)",
      ref: "battleLength",
      type: "number",
      min: 5,
      max: 120,
      value: defaults.battleLength,
    },
  ];

  function onHostGame(setupId, getFormFieldValue) {
    const scheduled = getFormFieldValue("scheduled");

    if (!setupId) return null;

    const hostPromise = axios.post("/api/game/host", {
      gameType,
      setup: setupId,
      lobby: getFormFieldValue("lobby"),
      lobbyName: getFormFieldValue("lobbyName"),
      private: getFormFieldValue("private"),
      guests: getFormFieldValue("guests"),
      spectating: getFormFieldValue("spectating"),
      scheduled:
        scheduled && new Date(getFormFieldValue("startDate")).getTime(),
      readyCheck: getFormFieldValue("readyCheck"),
      stateLengths: {
        Placement: getFormFieldValue("placementLength"),
        Battle: getFormFieldValue("battleLength"),
      },
      boardSize: getFormFieldValue("boardSize"),
      shipLayout: getFormFieldValue("shipLayout"),
      anonymousGame: getFormFieldValue("anonymousGame"),
      anonymousDeckId: getFormFieldValue("anonymousDeckId"),
    });

    Object.keys(defaults).forEach((key) => {
      const submittedValue = getFormFieldValue(key);
      if (submittedValue !== undefined && submittedValue !== null) {
        defaults[key] = submittedValue;
      }
    });
    persistDefaults(gameType, defaults);

    return hostPromise;
  }

  return [initialFormFields, onHostGame];
}

