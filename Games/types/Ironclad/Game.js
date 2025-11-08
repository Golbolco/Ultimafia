const Game = require("../../core/Game");
const Winners = require("../../core/Winners");
const Player = require("./Player");
const Random = require("../../../lib/Random");

module.exports = class IroncladGame extends Game {
  constructor(options) {
    super(options);

    this.type = "Ironclad";
    this.Player = Player;

    this.boardSize = parseInt(options.settings.boardSize) || 10;
    this.squareSize = 24;
    this.shipBlueprint = this.parseShipLayout(options.settings.shipLayout);

    this.states = [
      { name: "Postgame" },
      { name: "Pregame" },
      {
        name: "Placement",
        length: options.settings.stateLengths["Placement"] ?? 300,
      },
      {
        name: "Battle",
        length: options.settings.stateLengths["Battle"] ?? 1800,
      },
    ];

    this.phase = "pregame";
    this.playerBoards = {};

    this.placementOrder = [];
    this.currentPlacementIndex = 0;
    this.currentPlacementPlayerId = null;

    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.currentTurnPlayerId = null;
    this.roundNumber = 0;

    this.lastAttack = null;
    this.diceHistory = [];
  }

  parseShipLayout(layoutSetting) {
    if (!layoutSetting) return [5, 4, 3, 3, 2];

    if (Array.isArray(layoutSetting)) {
      const parsed = layoutSetting
        .map((n) => parseInt(n))
        .filter((n) => Number.isInteger(n) && n > 0);
      return parsed.length ? parsed : [5, 4, 3, 3, 2];
    }

    const parsed = String(layoutSetting)
      .split(/[,\s]+/)
      .map((n) => parseInt(n))
      .filter((n) => Number.isInteger(n) && n > 0);

    return parsed.length ? parsed : [5, 4, 3, 3, 2];
  }

  incrementState() {
    const previousState = this.getStateName();

    super.incrementState();

    const state = this.getStateInfo().name;

    if (state === "Placement" && previousState === "Pregame") {
      this.startPlacementPhase();
    } else if (state === "Battle" && this.phase !== "battle") {
      this.beginBattlePhase();
    }
  }

  startPlacementPhase() {
    this.phase = "placement";

    const activePlayers = this.getActiveNavyPlayerIds();
    this.placementOrder = Random.randomizeArray([...activePlayers]);
    this.currentPlacementIndex = 0;
    this.currentPlacementPlayerId = this.placementOrder[0] ?? null;

    activePlayers.forEach((playerId) => {
      this.playerBoards[playerId] = this.createPlayerBoardState(playerId);
    });

    if (activePlayers.length === 0) {
      this.sendAlert("No Admirals available. Ending game.");
      this.immediateEnd();
      return;
    }

    this.sendAlert(
      "Ironclad deployment phase has begun. Admirals take turns dropping ships with gravity-assisted placement."
    );
    this.sendGameState();
  }

  beginBattlePhase() {
    this.phase = "battle";

    const activePlayers = this.getActiveNavyPlayerIds().filter((id) =>
      this.hasShipsRemaining(id)
    );

    this.turnOrder = Random.randomizeArray([...activePlayers]);
    this.currentTurnIndex = 0;
    this.currentTurnPlayerId = this.turnOrder[0] ?? null;
    this.roundNumber = this.turnOrder.length ? 1 : 0;

    if (this.turnOrder.length <= 1) {
      this.checkGameEnd();
      this.sendGameState();
      return;
    }

    this.sendAlert(
      `${this.getPlayerName(this.currentTurnPlayerId)} has initiative. Roll the dice and fire!`
    );
    this.sendGameState();
  }

  getActiveNavyPlayerIds() {
    return this.players
      .array()
      .filter(
        (player) =>
          player.alive &&
          player.role &&
          player.role.alignment &&
          player.role.alignment !== "Host"
      )
      .map((player) => player.id);
  }

  createPlayerBoardState(playerId) {
    return {
      playerId,
      primary: this.createEmptyPrimaryGrid(),
      tracking: this.createEmptyTrackingGrid(),
      ships: [],
      pendingShips: [...this.shipBlueprint],
      ready: false,
    };
  }

  createEmptyPrimaryGrid() {
    const grid = [];

    for (let row = 0; row < this.boardSize; row++) {
      const rowData = [];
      for (let col = 0; col < this.boardSize; col++) {
        rowData.push({
          row,
          col,
          shipId: null,
          status: "empty",
          revealed: false,
        });
      }
      grid.push(rowData);
    }

    return grid;
  }

  createEmptyTrackingGrid() {
    const grid = [];

    for (let row = 0; row < this.boardSize; row++) {
      const rowData = [];
      for (let col = 0; col < this.boardSize; col++) {
        rowData.push({
          row,
          col,
          status: "unknown",
        });
      }
      grid.push(rowData);
    }

    return grid;
  }

  handleShipPlacement(playerId, data = {}) {
    if (this.phase !== "placement") {
      this.notifyPlayer(playerId, "Placements are locked. Await the battle phase.");
      return;
    }

    const playerState = this.playerBoards[playerId];
    if (!playerState) {
      this.notifyPlayer(playerId, "Unable to place ships right now.");
      return;
    }

    if (playerId !== this.currentPlacementPlayerId) {
      this.notifyPlayer(playerId, "Hold position Admiral. It is not your turn to deploy.");
      return;
    }

    if (!playerState.pendingShips.length) {
      this.notifyPlayer(playerId, "All of your ships are already in the water.");
      return;
    }

    const orientation =
      data.orientation === "horizontal" ? "horizontal" : "vertical";
    const column = Number.isInteger(data.column)
      ? data.column
      : parseInt(data.column);

    if (!Number.isInteger(column) || column < 0 || column >= this.boardSize) {
      this.notifyPlayer(playerId, "Choose a valid column for deployment.");
      return;
    }

    const length = playerState.pendingShips[0];

    let placementResult;
    if (orientation === "vertical") {
      placementResult = this.tryPlaceVerticalShip(playerState, column, length);
    } else {
      placementResult = this.tryPlaceHorizontalShip(playerState, column, length);
    }

    if (!placementResult.success) {
      this.notifyPlayer(playerId, placementResult.message);
      return;
    }

    const shipId = `S${playerState.ships.length + 1}`;
    const shipCells = [];

    placementResult.coordinates.forEach(({ row, col }) => {
      const cell = playerState.primary[row][col];
      cell.shipId = shipId;
      cell.status = "ship";
      cell.revealed = false;

      shipCells.push({
        row,
        col,
        hit: false,
      });
    });

    playerState.ships.push({
      id: shipId,
      length,
      orientation,
      cells: shipCells,
      sunk: false,
    });

    playerState.pendingShips.shift();
    playerState.ready = playerState.pendingShips.length === 0;

    this.sendAlert(
      `${this.getPlayerName(playerId)} drops a ${length}-segment vessel into column ${
        column + 1
      } (${orientation}).`,
      this.players
    );

    this.advancePlacementTurn();
    this.sendGameState();
  }

  notifyPlayer(playerId, message) {
    const player = this.getPlayer(playerId);
    if (player) {
      this.sendAlert(message, [player]);
    }
  }

  tryPlaceVerticalShip(playerState, column, length) {
    for (let startRow = this.boardSize - length; startRow >= 0; startRow--) {
      let fits = true;

      for (let offset = 0; offset < length; offset++) {
        const cell = playerState.primary[startRow + offset][column];
        if (!cell || cell.shipId) {
          fits = false;
          break;
        }
      }

      if (!fits) continue;

      const bottomRow = startRow + length - 1;
      if (
        bottomRow === this.boardSize - 1 ||
        playerState.primary[bottomRow + 1][column].shipId
      ) {
        const coordinates = [];
        for (let offset = 0; offset < length; offset++) {
          coordinates.push({ row: startRow + offset, col: column });
        }
        return { success: true, coordinates };
      }
    }

    return {
      success: false,
      message:
        "No room to drop a vertical hull in that column. Try a different spot or orientation.",
    };
  }

  tryPlaceHorizontalShip(playerState, startColumn, length) {
    if (startColumn < 0 || startColumn + length > this.boardSize) {
      return {
        success: false,
        message: "The ship would extend beyond the grid horizontally.",
      };
    }

    for (let row = this.boardSize - 1; row >= 0; row--) {
      let fits = true;

      for (let offset = 0; offset < length; offset++) {
        const cell = playerState.primary[row][startColumn + offset];
        if (!cell || cell.shipId) {
          fits = false;
          break;
        }
      }

      if (!fits) continue;

      if (row === this.boardSize - 1) {
        const coordinates = [];
        for (let offset = 0; offset < length; offset++) {
          coordinates.push({ row, col: startColumn + offset });
        }
        return { success: true, coordinates };
      }

      let supported = true;
      for (let offset = 0; offset < length; offset++) {
        if (!playerState.primary[row + 1][startColumn + offset].shipId) {
          supported = false;
          break;
        }
      }

      if (supported) {
        const coordinates = [];
        for (let offset = 0; offset < length; offset++) {
          coordinates.push({ row, col: startColumn + offset });
        }
        return { success: true, coordinates };
      }
    }

    return {
      success: false,
      message:
        "Unable to land a horizontal hull there. You need solid support beneath the entire keel.",
    };
  }

  advancePlacementTurn() {
    if (this.phase !== "placement") return;

    if (this.areAllPlayersReadyForBattle()) {
      this.sendAlert("All fleets deployed. Prepare for combat!");
      this.incrementState();
      return;
    }

    if (!this.placementOrder.length) {
      this.currentPlacementPlayerId = null;
      return;
    }

    let attempts = 0;
    do {
      this.currentPlacementIndex =
        (this.currentPlacementIndex + 1) % this.placementOrder.length;
      const candidateId = this.placementOrder[this.currentPlacementIndex];
      const candidate = this.playerBoards[candidateId];
      if (candidate && candidate.pendingShips.length > 0) {
        this.currentPlacementPlayerId = candidateId;
        return;
      }
      attempts++;
    } while (attempts < this.placementOrder.length);

    this.currentPlacementPlayerId = null;
  }

  areAllPlayersReadyForBattle() {
    return Object.values(this.playerBoards).every(
      (state) => state.ready || state.pendingShips.length === 0
    );
  }

  handleAttack(playerId, data = {}) {
    if (this.phase !== "battle") {
      this.notifyPlayer(playerId, "Combat has not begun yet.");
      return;
    }

    if (playerId !== this.currentTurnPlayerId) {
      this.notifyPlayer(playerId, "It is not your firing phase.");
      return;
    }

    const attackerState = this.playerBoards[playerId];
    if (!attackerState) {
      this.notifyPlayer(playerId, "No fleet data found for your Admiral.");
      return;
    }

    const targetPlayerId =
      data.targetPlayerId && this.playerBoards[data.targetPlayerId]
        ? data.targetPlayerId
        : this.getDefaultTargetPlayerId(playerId);

    if (!targetPlayerId) {
      this.notifyPlayer(playerId, "No valid opponent to target.");
      return;
    }

    const defenderState = this.playerBoards[targetPlayerId];

    const row = Number.isInteger(data.row) ? data.row : parseInt(data.row);
    const col = Number.isInteger(data.column)
      ? data.column
      : parseInt(data.column);

    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= this.boardSize ||
      col < 0 ||
      col >= this.boardSize
    ) {
      this.notifyPlayer(playerId, "Select a valid coordinate to shell.");
      return;
    }

    const targetCell = defenderState.primary[row][col];
    if (!targetCell) {
      this.notifyPlayer(playerId, "Targeting data invalid.");
      return;
    }

    if (targetCell.revealed && targetCell.status !== "ship") {
      this.notifyPlayer(playerId, "That sector is already charted.");
      return;
    }

    const attackRolls = this.rollDice(3);
    const defenseRolls = this.rollDice(2);
    const adjacencyBonus = this.getAdjacencyBonus(
      defenderState,
      row,
      col,
      targetCell.shipId
    );

    const attackTotal = this.sumDice(attackRolls);
    const defenseTotal = this.sumDice(defenseRolls) + adjacencyBonus;

    let result = "miss";

    if (targetCell.shipId && attackTotal > defenseTotal) {
      result = "hit";
      targetCell.status = "hit";
      targetCell.revealed = true;

      const ship = defenderState.ships.find(
        (candidate) => candidate.id === targetCell.shipId
      );
      if (ship) {
        const segment = ship.cells.find(
          (segment) => segment.row === row && segment.col === col
        );
        if (segment) segment.hit = true;
        ship.sunk = ship.cells.every((segment) => segment.hit);
      }

      attackerState.tracking[row][col] = { row, col, status: "hit" };
    } else {
      targetCell.status =
        targetCell.shipId && attackTotal <= defenseTotal ? "ship" : "miss";
      targetCell.revealed = true;

      attackerState.tracking[row][col] = {
        row,
        col,
        status: targetCell.shipId ? "miss" : "miss",
      };
    }

    this.lastAttack = {
      attackerId: playerId,
      defenderId: targetPlayerId,
      row,
      col,
      attackRolls,
      defenseRolls,
      adjacencyBonus,
      attackTotal,
      defenseTotal,
      result,
      timestamp: Date.now(),
    };

    this.diceHistory.push(this.lastAttack);
    if (this.diceHistory.length > 15) {
      this.diceHistory.shift();
    }

    if (result === "hit") {
      this.sendAlert(
        `${this.getPlayerName(playerId)} scores a hit on ${
          this.getPlayerName(targetPlayerId)
        }! (${attackTotal} vs ${defenseTotal})`
      );
    } else {
      this.sendAlert(
        `${this.getPlayerName(playerId)} fires on ${
          this.getPlayerName(targetPlayerId)
        } but the salvo disperses. (${attackTotal} vs ${defenseTotal})`
      );
    }

    const defenderEliminated = !this.hasShipsRemaining(targetPlayerId);
    if (defenderEliminated) {
      this.sendAlert(
        `${this.getPlayerName(targetPlayerId)}'s fleet is sunk!`
      );
    }

    const finished = this.checkGameEnd();

    if (!finished) {
      this.advanceTurn();
      this.sendGameState();
    } else {
      this.sendGameState();
    }
  }

  getDefaultTargetPlayerId(attackerId) {
    return this.turnOrder.find(
      (playerId) => playerId !== attackerId && this.hasShipsRemaining(playerId)
    );
  }

  rollDice(count) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    return rolls;
  }

  sumDice(rolls) {
    return rolls.reduce((total, value) => total + value, 0);
  }

  getAdjacencyBonus(defenderState, row, col, shipId) {
    if (!shipId) return 0;

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    let bonus = 0;

    for (const { dr, dc } of directions) {
      const neighbor = defenderState.primary[row + dr]?.[col + dc];
      if (neighbor && neighbor.shipId === shipId && neighbor.status === "ship") {
        bonus += 1;
      }
    }

    return bonus;
  }

  hasShipsRemaining(playerId) {
    const state = this.playerBoards[playerId];
    if (!state) return false;

    return state.ships.some((ship) => !ship.sunk);
  }

  advanceTurn() {
    if (!this.turnOrder.length) {
      this.currentTurnPlayerId = null;
      return;
    }

    this.turnOrder = this.turnOrder.filter((id) =>
      this.hasShipsRemaining(id)
    );

    if (!this.turnOrder.length) {
      this.currentTurnPlayerId = null;
      return;
    }

    if (!this.turnOrder.includes(this.currentTurnPlayerId)) {
      this.currentTurnIndex = 0;
      this.currentTurnPlayerId = this.turnOrder[0];
      return;
    }

    const currentIndex = this.turnOrder.indexOf(this.currentTurnPlayerId);
    const nextIndex = (currentIndex + 1) % this.turnOrder.length;

    if (nextIndex === 0) this.roundNumber += 1;

    this.currentTurnIndex = nextIndex;
    this.currentTurnPlayerId = this.turnOrder[nextIndex];
  }

  getPlayerName(playerId) {
    const player = this.getPlayer(playerId);
    return player ? player.name : "Unknown Admiral";
  }

  buildBaseGameState() {
    return {
      type: this.type,
      phase: this.phase,
      boardSize: this.boardSize,
      squareSize: this.squareSize,
      shipBlueprint: this.shipBlueprint,
      placement: {
        order: this.placementOrder,
        currentPlayerId: this.currentPlacementPlayerId,
      },
      battle: {
        turnOrder: this.turnOrder,
        currentTurnPlayerId: this.currentTurnPlayerId,
        round: this.roundNumber,
      },
      lastAttack: this.lastAttack,
      diceHistory: this.diceHistory,
      finished: this.finished,
      timestamp: Date.now(),
    };
  }

  buildGameStateForViewer(viewerId, revealAll = false) {
    const base = this.buildBaseGameState();
    base.viewerId = viewerId ?? null;
    base.viewerPerspective = revealAll ? "spectator" : "player";
    base.boards = {};

    const showAll = revealAll || this.finished;

    for (const [playerId, board] of Object.entries(this.playerBoards)) {
      const isOwner = !revealAll && viewerId === playerId;
      const revealShips = showAll || isOwner;
      const includeTracking = revealAll || isOwner;

      base.boards[playerId] = this.serializePlayerBoard(board, {
        revealShips,
        includeTracking,
        includePendingDetail: revealShips,
      });
    }

    return base;
  }

  serializePlayerBoard(board, options) {
    const { revealShips, includeTracking, includePendingDetail } = options;

    const primary = board.primary.map((row) =>
      row.map((cell) => this.serializePrimaryCell(cell, revealShips))
    );

    const ships = board.ships.map((ship) => {
      const info = {
        id: ship.id,
        length: ship.length,
        sunk: ship.sunk,
        hits: ship.cells.filter((segment) => segment.hit).length,
      };

      if (revealShips) {
        info.cells = ship.cells.map((segment) => ({ ...segment }));
      }

      return info;
    });

    return {
      playerId: board.playerId,
      ready: board.ready,
      pendingShips: includePendingDetail
        ? [...board.pendingShips]
        : board.pendingShips.length,
      fleetIntegrity: this.getFleetIntegrity(board),
      ships,
      primary,
      tracking: includeTracking
        ? board.tracking.map((row) =>
            row.map((cell) => ({
              row: cell.row,
              col: cell.col,
              status: cell.status,
            }))
          )
        : null,
    };
  }

  serializePrimaryCell(cell, revealShips) {
    if (revealShips) {
      return {
        row: cell.row,
        col: cell.col,
        status: cell.status,
        shipId: cell.shipId,
        revealed: cell.revealed,
      };
    }

    if (cell.status === "hit") {
      return {
        row: cell.row,
        col: cell.col,
        status: "hit",
        shipId: null,
        revealed: true,
      };
    }

    if (cell.status === "miss") {
      return {
        row: cell.row,
        col: cell.col,
        status: "miss",
        shipId: null,
        revealed: true,
      };
    }

    return {
      row: cell.row,
      col: cell.col,
      status: "fog",
      shipId: null,
      revealed: false,
    };
  }

  getFleetIntegrity(board) {
    const totalSegments = board.ships.reduce(
      (sum, ship) => sum + ship.length,
      0
    );
    const hits = board.ships.reduce(
      (sum, ship) => sum + ship.cells.filter((segment) => segment.hit).length,
      0
    );
    const afloat = board.ships.filter((ship) => !ship.sunk).length;

    return {
      totalSegments,
      hits,
      afloat,
    };
  }

  sendGameState() {
    for (let player of this.players) {
      player.send("gameState", this.buildGameStateForViewer(player.id, false));
    }

    for (let spectator of this.spectators) {
      spectator.send(
        "gameState",
        this.buildGameStateForViewer(null, true)
      );
    }
  }

  getStateInfo(state) {
    const info = super.getStateInfo(state);
    info.extraInfo = this.buildGameStateForViewer(null, true);
    return info;
  }

  checkWinConditions() {
    const winners = new Winners(this);
    const activeIds = this.getActiveNavyPlayerIds();
    const survivors = activeIds.filter((id) => this.hasShipsRemaining(id));

    let finished = false;

    if (this.phase === "battle" && survivors.length <= 1) {
      finished = true;

      if (survivors.length === 1) {
        const player = this.getPlayer(survivors[0]);
        if (player) winners.addPlayer(player, "Commanded the surviving fleet");
      } else {
        winners.addGroup("No one");
      }
    }

    winners.determinePlayers();
    return [finished, winners];
  }
};

