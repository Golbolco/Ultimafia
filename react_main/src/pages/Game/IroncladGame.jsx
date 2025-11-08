import React, { useContext, useEffect, useMemo, useState } from "react";

import {
  useSocketListeners,
  ThreePanelLayout,
  TopBar,
  TextMeetingLayout,
  ActionList,
  PlayerList,
  SettingsMenu,
  MobileLayout,
  GameTypeContext,
  SideMenu,
} from "./Game";
import { GameContext } from "../../Contexts";
import { useIsPhoneDevice } from "hooks/useIsPhoneDevice";

import "css/gameIronclad.css";

function getPlayerName(players, playerId) {
  if (!playerId || !players) return "Unknown Admiral";
  const player = players[playerId];
  return player ? player.name : "Unknown Admiral";
}

function columnLabels(size) {
  return Array.from({ length: size }, (_, index) =>
    String.fromCharCode(65 + index)
  );
}

export default function IroncladGame() {
  const game = useContext(GameContext);
  const isPhoneDevice = useIsPhoneDevice();

  useEffect(() => {
    game.updateStateViewing({ type: "current" });
  }, [game.history.currentState]);

  return (
    <GameTypeContext.Provider
      value={{
        singleState: true,
      }}
    >
      <TopBar />
      <ThreePanelLayout
        leftPanelContent={
          <>
            <PlayerList />
            <ActionList />
            <SettingsMenu />
          </>
        }
        centerPanelContent={<IroncladBoardWrapper />}
        rightPanelContent={<TextMeetingLayout />}
      />
      <MobileLayout
        centerContent={<IroncladBoardWrapper />}
        innerRightContent={
          <>
            <TextMeetingLayout />
            <ActionList />
          </>
        }
      />
    </GameTypeContext.Provider>
  );
}

function IroncladBoardWrapper() {
  const game = useContext(GameContext);
  const stateViewing = game.stateViewing;

  if (stateViewing < 0) return <TextMeetingLayout />;

  return (
    <SideMenu
      title="Ironclad Command"
      scrollable
      content={<IroncladBoard />}
    />
  );
}

function IroncladBoard() {
  const game = useContext(GameContext);
  const { history, stateViewing, self, socket, players, isSpectator, review } =
    game;

  const [liveState, setLiveState] = useState(null);
  const [orientation, setOrientation] = useState("vertical");
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  useSocketListeners(
    (sock) => {
      sock.on("gameState", (state) => {
        setLiveState(state);
      });
    },
    socket
  );

  const viewedState = useMemo(() => {
    if (stateViewing >= 0) {
      const extraInfo = history.states[stateViewing]?.extraInfo;
      if (extraInfo) return extraInfo;
    }

    if (liveState) return liveState;

    const currentExtra =
      history.states[history.currentState]?.extraInfo ?? null;
    return currentExtra;
  }, [history, stateViewing, liveState]);

  useEffect(() => {
    if (!viewedState || !self?.id) return;

    const opponentEntries = Object.entries(viewedState.boards || {}).filter(
      ([playerId]) => playerId !== self.id
    );

    if (opponentEntries.length === 0) {
      setSelectedTargetId(null);
    } else if (
      selectedTargetId === null ||
      !opponentEntries.find(([id]) => id === selectedTargetId)
    ) {
      setSelectedTargetId(opponentEntries[0][0]);
    }
  }, [viewedState, self?.id]);

  if (!viewedState) {
    return (
      <div className="ironclad-placeholder">
        Awaiting Ironclad telemetry...
      </div>
    );
  }

  const selfId = self?.id ?? null;
  const selfBoard = selfId ? viewedState.boards?.[selfId] : null;
  const boardSize = viewedState.boardSize || 10;
  const opponents = Object.entries(viewedState.boards || {}).filter(
    ([playerId]) => playerId !== selfId
  );

  const canInteract =
    !!socket?.send &&
    !review &&
    !isSpectator &&
    (stateViewing === history.currentState || stateViewing === -1);

  const phase = viewedState.phase;
  const isPlacementPhase = phase === "placement";
  const isBattlePhase = phase === "battle";
  const myPlacementTurn =
    isPlacementPhase &&
    selfId &&
    viewedState.placement?.currentPlayerId === selfId;
  const myBattleTurn =
    isBattlePhase &&
    selfId &&
    viewedState.battle?.currentTurnPlayerId === selfId;
  const nextHull =
    selfBoard && Array.isArray(selfBoard.pendingShips)
      ? selfBoard.pendingShips[0]
      : null;

  const targetId =
    selectedTargetId ||
    (opponents.length === 1 ? opponents[0][0] : opponents[0]?.[0]);

  function handlePlacement(column) {
    if (!canInteract || !myPlacementTurn || socket.readyState >= 2) return;
    socket.send("placeShip", {
      column,
      orientation,
    });
  }

  function handleAttack(row, column) {
    if (!canInteract || !myBattleTurn || socket.readyState >= 2) return;
    socket.send("attackSquare", {
      row,
      column,
      targetPlayerId: targetId,
    });
  }

  const lastAttack = viewedState.lastAttack;

  return (
    <div className="ironclad-root">
      <header className="ironclad-header">
        <div className="ironclad-phase">
          <span className="ironclad-phase__label">Phase:</span>{" "}
          <span className="ironclad-phase__value">
            {phase === "placement" ? "Placement" : "Battle"}
          </span>
        </div>
        {isBattlePhase && (
          <div className="ironclad-phase">
            <span className="ironclad-phase__label">Turn:</span>{" "}
            <span className="ironclad-phase__value">
              {getPlayerName(players, viewedState.battle?.currentTurnPlayerId)}
            </span>
          </div>
        )}
        {isBattlePhase && (
          <div className="ironclad-phase">
            <span className="ironclad-phase__label">Round:</span>{" "}
            <span className="ironclad-phase__value">
              {viewedState.battle?.round ?? 0}
            </span>
          </div>
        )}
      </header>

      {isPlacementPhase && selfBoard && (
        <section className="ironclad-panel">
          <h3>Deployment Orders</h3>
          <div className="ironclad-panel__body">
            <div className="ironclad-pill">
              Next Hull:{" "}
              {nextHull ? `${nextHull} segments` : "All ships deployed"}
            </div>
            <div className="ironclad-pill">
              Orientation:{" "}
              <button
                type="button"
                className={`ironclad-toggle ${
                  orientation === "vertical" ? "ironclad-toggle--active" : ""
                }`}
                onClick={() => setOrientation("vertical")}
                disabled={!canInteract || !myPlacementTurn}
              >
                Vertical Drop
              </button>
              <button
                type="button"
                className={`ironclad-toggle ${
                  orientation === "horizontal" ? "ironclad-toggle--active" : ""
                }`}
                onClick={() => setOrientation("horizontal")}
                disabled={!canInteract || !myPlacementTurn}
              >
                Horizontal Glide
              </button>
            </div>
            <div className="ironclad-info">
              {myPlacementTurn
                ? "Select a column on your fleet grid to release the hull."
                : `Awaiting ${
                    getPlayerName(
                      players,
                      viewedState.placement?.currentPlayerId
                    ) || "next Admiral"
                  }`}
            </div>
          </div>
        </section>
      )}

      {lastAttack && (
        <section className="ironclad-panel">
          <h3>Last Salvo</h3>
          <div className="ironclad-panel__body ironclad-panel__body--grid">
            <div>
              <span className="ironclad-phase__label">Attacker:</span>{" "}
              <span className="ironclad-phase__value">
                {getPlayerName(players, lastAttack.attackerId)}
              </span>
            </div>
            <div>
              <span className="ironclad-phase__label">Target:</span>{" "}
              <span className="ironclad-phase__value">
                {getPlayerName(players, lastAttack.defenderId)}
              </span>
            </div>
            <div>
              <span className="ironclad-phase__label">Sector:</span>{" "}
              <span className="ironclad-phase__value">
                {String.fromCharCode(65 + lastAttack.col)}
                {lastAttack.row + 1}
              </span>
            </div>
            <div>
              <span className="ironclad-phase__label">Rolls:</span>{" "}
              <span className="ironclad-phase__value ironclad-rolls">
                {lastAttack.attackRolls.join(", ")} vs{" "}
                {lastAttack.defenseRolls.join(", ")}
                {lastAttack.adjacencyBonus
                  ? ` +${lastAttack.adjacencyBonus}`
                  : ""}
              </span>
            </div>
            <div>
              <span className="ironclad-phase__label">Result:</span>{" "}
              <span
                className={`ironclad-phase__value ironclad-phase__value--${lastAttack.result}`}
              >
                {lastAttack.result === "hit" ? "Direct Hit" : "Miss"}
              </span>
            </div>
          </div>
        </section>
      )}

      {selfBoard && (
        <section className="ironclad-panel">
          <h3>Your Fleet</h3>
          <div className="ironclad-panel__body">
            <FleetSummary board={selfBoard} />
            <LabeledGrid
              board={selfBoard.primary}
              size={boardSize}
              interactive={canInteract && myPlacementTurn}
              mode="primary"
              onCellClick={(row, column) => handlePlacement(column)}
            />
          </div>
        </section>
      )}

      {selfBoard && selfBoard.tracking && (
        <section className="ironclad-panel">
          <h3>Targeting Computer</h3>
          <div className="ironclad-panel__body">
            {opponents.length > 1 && (
              <div className="ironclad-target-select">
                <label htmlFor="ironclad-target">Target Admiral:</label>
                <select
                  id="ironclad-target"
                  value={targetId || ""}
                  onChange={(event) => setSelectedTargetId(event.target.value)}
                  disabled={!canInteract}
                >
                  {opponents.map(([opponentId]) => (
                    <option key={opponentId} value={opponentId}>
                      {getPlayerName(players, opponentId)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <LabeledGrid
              board={selfBoard.tracking}
              size={boardSize}
              interactive={canInteract && myBattleTurn}
              mode="tracking"
              onCellClick={(row, column) => handleAttack(row, column)}
            />
            <div className="ironclad-info">
              {myBattleTurn
                ? "Select a sector to fire upon."
                : "Await your bombardment window."}
            </div>
          </div>
        </section>
      )}

      {opponents.length > 0 && (
        <section className="ironclad-panel">
          <h3>Reconnaissance</h3>
          <div className="ironclad-recon-grid">
            {opponents.map(([opponentId, board]) => (
              <div key={opponentId} className="ironclad-recon-card">
                <header className="ironclad-recon-card__header">
                  {getPlayerName(players, opponentId)}
                </header>
                <FleetSummary board={board} hidePending />
                <LabeledGrid
                  board={board.primary}
                  size={boardSize}
                  interactive={false}
                  mode="primary"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FleetSummary({ board, hidePending = false }) {
  if (!board) return null;

  const integrity = board.fleetIntegrity || {
    totalSegments: 0,
    hits: 0,
    afloat: 0,
  };

  return (
    <div className="ironclad-summary">
      <div className="ironclad-summary__item">
        <span className="ironclad-summary__value">{integrity.afloat}</span>
        <span className="ironclad-summary__label">Ships Afloat</span>
      </div>
      <div className="ironclad-summary__item">
        <span className="ironclad-summary__value">
          {integrity.totalSegments - integrity.hits}
        </span>
        <span className="ironclad-summary__label">Hull Segments Intact</span>
      </div>
      {!hidePending && (
        <div className="ironclad-summary__item">
          <span className="ironclad-summary__value">
            {Array.isArray(board.pendingShips)
              ? board.pendingShips.length
              : board.pendingShips || 0}
          </span>
          <span className="ironclad-summary__label">Ships Remaining</span>
        </div>
      )}
      <div className="ironclad-summary__item">
        <span className="ironclad-summary__value">
          {integrity.hits}
        </span>
        <span className="ironclad-summary__label">Direct Hits Taken</span>
      </div>
    </div>
  );
}

function LabeledGrid({ board, size, interactive, mode, onCellClick }) {
  const columns = columnLabels(size);

  if (!board) return null;

  const gridStyle = {
    "--ironclad-cell-size": "24px",
    gridTemplateColumns: `repeat(${size + 1}, 24px)`,
    gridAutoRows: `24px`,
  };

  return (
    <div className={`ironclad-grid ironclad-grid--${mode}`} style={gridStyle}>
      <div className="ironclad-grid__label ironclad-grid__label--corner" />
      {columns.map((label) => (
        <div key={label} className="ironclad-grid__label">
          {label}
        </div>
      ))}
      {board.map((row, rowIndex) => (
        <React.Fragment key={`row-${rowIndex}`}>
          <div className="ironclad-grid__label ironclad-grid__label--row">
            {rowIndex + 1}
          </div>
          {row.map((cell, columnIndex) => {
            const status = normaliseStatus(cell, mode);
            const isInteractable =
              interactive &&
              ((mode === "primary" && status !== "hit") ||
                (mode === "tracking" && status === "unknown"));

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={`ironclad-cell ironclad-cell--${status} ${
                  isInteractable ? "ironclad-cell--interactive" : ""
                }`}
                onClick={() =>
                  isInteractable &&
                  onCellClick(rowIndex, columnIndex, cell.playerId)
                }
                role={isInteractable ? "button" : "img"}
                aria-label={`${
                  columns[columnIndex]
                }${rowIndex + 1}: ${status}`}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function normaliseStatus(cell, mode) {
  if (!cell) return "fog";
  const status = cell.status || "fog";

  if (mode === "tracking") {
    if (status === "unknown") return "unknown";
    if (status === "hit") return "hit";
    if (status === "miss") return "miss";
    return "unknown";
  }

  if (status === "ship") return "ship";
  if (status === "hit") return "hit";
  if (status === "miss") return "miss";
  return "fog";
}

