const Game = require("../../core/Game");
const Player = require("./Player");
const Random = require("../../../lib/Random");
const Winners = require("../../core/Winners");

const TERRAINS = [
  { name: "Pasture", resource: "Livestock", count: 4, color: "#9ccc65" },
  { name: "Field", resource: "Bread", count: 4, color: "#fdd835" },
  { name: "Forest", resource: "Timber", count: 4, color: "#2e7d32" },
  { name: "Hill", resource: "Clay", count: 3, color: "#ef6c00" },
  { name: "Mountain", resource: "Stone", count: 3, color: "#757575" },
  { name: "Desert", resource: null, count: 1, color: "#d7b98e" },
];

const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const RESOURCE_TYPES = ["Livestock", "Bread", "Timber", "Clay", "Stone"];
const HARBOR_TYPES = [
  "3:1",
  "3:1",
  "3:1",
  "3:1",
  "3:1",
  "Livestock 2:1",
  "Bread 2:1",
  "Timber 2:1",
  "Clay 2:1",
];
const DEV_CARDS = [
  ...Array(14).fill("Knight"),
  ...Array(5).fill("Victory Point"),
  ...Array(2).fill("Road Building"),
  ...Array(2).fill("Year Of Plenty"),
  ...Array(2).fill("Monopoly"),
];
const HEX_OFFSETS = [
  [Math.sqrt(3) / 2, 0.5],
  [0, 1],
  [-Math.sqrt(3) / 2, 0.5],
  [-Math.sqrt(3) / 2, -0.5],
  [0, -1],
  [Math.sqrt(3) / 2, -0.5],
];

module.exports = class SettlersGame extends Game {
  constructor(options) {
    super(options);

    this.type = "Settlers";
    this.Player = Player;
    this.states = [
      { name: "Postgame" },
      { name: "Pregame" },
      {
        name: "Initial Placement",
        length: options.settings.stateLengths["Initial Placement"],
      },
      {
        name: "Turn",
        length: options.settings.stateLengths["Turn"],
      },
    ];

    this.maxRounds = parseInt(options.settings.maxRounds) || 40;
    this.round = 1;
    this.turnOrder = [];
    this.turnOrderIndex = 0;
    this.initialPlacementQueue = [];
    this.initialPlacementIndex = 0;
    this.rollDoneThisTurn = false;
    this.playedDevCardThisTurnByPlayerId = {};
    this.pendingDiscardByPlayerId = {};
    this.pendingRobberPlayerId = null;
    this.pendingStealPlayerId = null;
    this.pendingStealCandidates = [];
    this.pendingFreeRoadsByPlayerId = {};

    this.resourceByPlayerId = {};
    this.developmentCardsByPlayerId = {};
    this.newDevelopmentCardsByPlayerId = {};
    this.playedKnightsByPlayerId = {};
    this.victoryPointDevCardsByPlayerId = {};
    this.roadsByPlayerId = {};
    this.harborsByPlayerId = {};
    this.longestRoadHolderId = null;
    this.longestRoadLength = 0;
    this.largestArmyHolderId = null;
    this.largestArmySize = 0;
    this.robberHexId = null;

    this.intersectionIds = [];
    this.roadIds = [];
    this.hexIds = [];
    this.resourceTargets = RESOURCE_TYPES.slice();
    this.playerTargets = [];
    this.yearPlentyTargets = this.buildYearPlentyTargets();
    this.tradeTargetsAll = this.buildAllTradeTargets();
    this.board = this.createBoard();

    this.lastVillagePlacementByPlayerId = {};
  }

  start() {
    const hasHost = !!this.setup.roles[0]["Host:"];
    const allPlayers = this.players.array();
    const hostPlayer = hasHost ? allPlayers[0] : null;
    const settlers = hasHost
      ? allPlayers.filter((player) => player !== hostPlayer)
      : allPlayers.slice();

    if (settlers.length < 3 || settlers.length > 4) {
      this.sendAlert("Settlers currently supports exactly 3-4 non-host players.");
      this.immediateEnd();
      return;
    }

    this.turnOrder = Random.randomizeArray(settlers);
    this.initialPlacementQueue = this.buildInitialPlacementQueue(this.turnOrder);
    this.playerTargets = settlers.map((player) => player.id);

    for (const player of settlers) {
      this.resourceByPlayerId[player.id] = this.makeEmptyResources();
      this.developmentCardsByPlayerId[player.id] = this.makeEmptyDevCards();
      this.newDevelopmentCardsByPlayerId[player.id] = this.makeEmptyDevCards();
      this.playedKnightsByPlayerId[player.id] = 0;
      this.victoryPointDevCardsByPlayerId[player.id] = 0;
      this.roadsByPlayerId[player.id] = [];
      this.harborsByPlayerId[player.id] = [];
      this.playedDevCardThisTurnByPlayerId[player.id] = false;
      this.pendingDiscardByPlayerId[player.id] = 0;
      this.pendingFreeRoadsByPlayerId[player.id] = 0;
    }

    super.start();
    this.sendAlert(
      `Settlers setup complete. Initial placement order: ${this.turnOrder
        .map((player) => player.name)
        .join(" -> ")} (snake for second placement).`
    );
  }

  incrementState(index, skipped) {
    const previousState = this.getStateName();
    super.incrementState(index, skipped);

    if (previousState === "Initial Placement" && this.getStateName() === "Turn") {
      this.turnOrderIndex = 0;
      this.beginTurn();
    } else if (previousState === "Turn" && this.getStateName() === "Turn") {
      this.advanceTurn();
      this.beginTurn();
    }
  }

  beginTurn() {
    const current = this.getCurrentTurnPlayer();
    if (!current) {
      return;
    }

    this.rollDoneThisTurn = false;
    this.playedDevCardThisTurnByPlayerId[current.id] = false;
    this.pendingFreeRoadsByPlayerId[current.id] = 0;
    this.mergeNewDevCards(current.id);
    this.rollAndDistributeResources(current);
    this.sendAlert(`${current.name}'s turn.`);
  }

  createBoard() {
    const hexes = [];
    const terrains = this.buildTerrainPool();
    const tokens = Random.randomizeArray(TOKENS.slice());
    const hexPositions = this.getHexPositions();
    const vertexMap = {};
    const edgesMap = {};
    const intersections = [];
    const roads = [];

    for (let i = 0; i < hexPositions.length; i++) {
      const [q, r] = hexPositions[i];
      const terrain = terrains[i];
      const center = this.hexToPixel(q, r);
      const vertexIds = [];

      for (let c = 0; c < 6; c++) {
        const vx = center.x + HEX_OFFSETS[c][0];
        const vy = center.y + HEX_OFFSETS[c][1];
        const key = this.vertexKey(vx, vy);
        if (!vertexMap[key]) {
          const id = `I${intersections.length + 1}`;
          vertexMap[key] = {
            id,
            x: vx,
            y: vy,
            adjacentHexes: [],
            adjacentIntersections: [],
            harborId: null,
            ownerId: null,
            level: null,
          };
          intersections.push(vertexMap[key]);
        }
        vertexMap[key].adjacentHexes.push(`H${i + 1}`);
        vertexIds.push(vertexMap[key].id);
      }

      for (let c = 0; c < 6; c++) {
        const a = vertexIds[c];
        const b = vertexIds[(c + 1) % 6];
        const edgeId = this.makeRoadId(a, b);
        if (!edgesMap[edgeId]) {
          edgesMap[edgeId] = {
            id: edgeId,
            a,
            b,
            ownerId: null,
            adjacentHexes: [`H${i + 1}`],
          };
        } else {
          edgesMap[edgeId].adjacentHexes.push(`H${i + 1}`);
        }
      }

      hexes.push({
        id: `H${i + 1}`,
        q,
        r,
        terrain: terrain.name,
        resource: terrain.resource,
        color: terrain.color,
        token: terrain.resource ? tokens.pop() : null,
        robber: terrain.resource == null,
        intersections: vertexIds,
      });
    }

    for (const edge of Object.values(edgesMap)) {
      roads.push(edge);
      const a = intersections.find((v) => v.id === edge.a);
      const b = intersections.find((v) => v.id === edge.b);
      if (!a.adjacentIntersections.includes(b.id)) {
        a.adjacentIntersections.push(b.id);
      }
      if (!b.adjacentIntersections.includes(a.id)) {
        b.adjacentIntersections.push(a.id);
      }
    }

    const coastalEdges = roads.filter((edge) => edge.adjacentHexes.length === 1);
    const sortedCoastal = coastalEdges
      .map((edge) => {
        const a = intersections.find((i) => i.id === edge.a);
        const b = intersections.find((i) => i.id === edge.b);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return { edge, angle: Math.atan2(my, mx) };
      })
      .sort((x, y) => x.angle - y.angle)
      .map((x) => x.edge);

    const harbors = [];
    const shuffledHarbors = Random.randomizeArray(HARBOR_TYPES.slice());
    const stride = Math.floor(sortedCoastal.length / 9);
    for (let i = 0; i < 9; i++) {
      const edge = sortedCoastal[i * stride];
      const harbor = {
        id: `HB${i + 1}`,
        type: shuffledHarbors[i],
        intersections: [edge.a, edge.b],
      };
      harbors.push(harbor);
      for (const intersectionId of harbor.intersections) {
        const intersection = intersections.find((item) => item.id === intersectionId);
        intersection.harborId = harbor.id;
      }
    }

    this.intersectionIds = intersections.map((intersection) => intersection.id);
    this.roadIds = roads.map((road) => road.id);
    this.hexIds = hexes.map((hex) => hex.id);
    const desertHex = hexes.find((hex) => hex.terrain === "Desert");
    this.robberHexId = desertHex?.id || hexes[0].id;

    return { hexes, intersections, roads, harbors, coastalEdges: sortedCoastal };
  }

  buildTerrainPool() {
    const terrains = [];
    for (const terrain of TERRAINS) {
      for (let i = 0; i < terrain.count; i++) {
        terrains.push({
          name: terrain.name,
          resource: terrain.resource,
          color: terrain.color,
        });
      }
    }
    return Random.randomizeArray(terrains);
  }

  buildInitialPlacementQueue(turnOrder) {
    const reverse = turnOrder.slice().reverse();
    return turnOrder.concat(reverse);
  }

  getHexPositions() {
    const result = [];
    for (let r = -2; r <= 2; r++) {
      const minQ = Math.max(-2, -r - 2);
      const maxQ = Math.min(2, -r + 2);
      for (let q = minQ; q <= maxQ; q++) {
        result.push([q, r]);
      }
    }
    return result;
  }

  hexToPixel(q, r) {
    const x = Math.sqrt(3) * (q + r / 2);
    const y = 1.5 * r;
    return { x, y };
  }

  vertexKey(x, y) {
    return `${x.toFixed(3)}:${y.toFixed(3)}`;
  }

  canPlaceVillage(player) {
    if (!this.isSettler(player)) {
      return false;
    }

    if (this.getStateName() === "Initial Placement") {
      const current = this.initialPlacementQueue[this.initialPlacementIndex];
      if (!current || current.id !== player.id) {
        return false;
      }
      return this.villagesByPlayerId[player.id].length < 2;
    }

    if (this.getStateName() !== "Turn" || !this.isCurrentTurnPlayer(player)) {
      return false;
    }
    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }
    if (this.pendingFreeRoadsByPlayerId[player.id] > 0) {
      return false;
    }

    return this.canAfford(player.id, {
      Livestock: 1,
      Bread: 1,
      Timber: 1,
      Clay: 1,
    });
  }

  canPlaceRoad(player) {
    if (!this.isSettler(player)) {
      return false;
    }

    if (this.getStateName() === "Initial Placement") {
      const current = this.initialPlacementQueue[this.initialPlacementIndex];
      if (!current || current.id !== player.id) {
        return false;
      }

      const requiredVillage = this.lastVillagePlacementByPlayerId[player.id];
      return !!requiredVillage;
    }

    if (this.getStateName() !== "Turn" || !this.isCurrentTurnPlayer(player)) {
      return false;
    }

    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }

    if (this.pendingFreeRoadsByPlayerId[player.id] > 0) {
      return true;
    }

    return this.canAfford(player.id, {
      Timber: 1,
      Clay: 1,
    });
  }

  canUpgradeCity(player) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }
    const ownedVillages = this.getPlayerIntersectionsByLevel(player.id, "village");
    if (!ownedVillages.length) {
      return false;
    }
    return this.canAfford(player.id, { Bread: 2, Stone: 3 });
  }

  canBuyDevelopmentCard(player) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }
    if (!this.devDeck.length) {
      return false;
    }
    return this.canAfford(player.id, { Livestock: 1, Bread: 1, Stone: 1 });
  }

  canPlayKnight(player) {
    return this.canPlayDevCard(player, "Knight");
  }

  canPlayRoadBuilding(player) {
    return this.canPlayDevCard(player, "Road Building");
  }

  canPlayYearOfPlenty(player) {
    return this.canPlayDevCard(player, "Year Of Plenty");
  }

  canPlayMonopoly(player) {
    return this.canPlayDevCard(player, "Monopoly");
  }

  canPlayDevCard(player, type) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }
    if (this.playedDevCardThisTurnByPlayerId[player.id]) {
      return false;
    }
    return (this.developmentCardsByPlayerId[player.id][type] || 0) > 0;
  }

  canMaritimeTrade(player) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    if (this.hasPendingTurnInterrupt(player.id)) {
      return false;
    }
    return this.tradeTargetsAll.some((trade) => this.canExecuteTrade(player.id, trade));
  }

  canDiscardResource(player) {
    if (this.getStateName() !== "Turn") {
      return false;
    }
    if (!this.isSettler(player)) {
      return false;
    }
    return (this.pendingDiscardByPlayerId[player.id] || 0) > 0;
  }

  canMoveRobber(player) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    if (this.getTotalPendingDiscards() > 0) {
      return false;
    }
    return this.pendingRobberPlayerId === player.id;
  }

  canStealResource(player) {
    if (!this.isCurrentTurnPlayer(player) || this.getStateName() !== "Turn") {
      return false;
    }
    return this.pendingStealPlayerId === player.id;
  }

  canEndTurn(player) {
    if (this.getStateName() !== "Turn" || !this.isCurrentTurnPlayer(player)) {
      return false;
    }
    if (this.getTotalPendingDiscards() > 0) {
      return false;
    }
    return !this.hasPendingTurnInterrupt(player.id);
  }

  hasPendingTurnInterrupt(playerId) {
    if ((this.pendingDiscardByPlayerId[playerId] || 0) > 0) {
      return true;
    }
    if (this.pendingRobberPlayerId === playerId) {
      return true;
    }
    if (this.pendingStealPlayerId === playerId) {
      return true;
    }
    return false;
  }

  getTotalPendingDiscards() {
    return Object.values(this.pendingDiscardByPlayerId).reduce(
      (acc, value) => acc + (value || 0),
      0
    );
  }

  tryPlaceVillage(player, intersectionId) {
    const intersection = this.board.intersections.find(
      (item) => item.id === intersectionId
    );
    if (!intersection || intersection.ownerId || intersection.level) {
      return;
    }

    if (!this.canPlaceVillage(player)) {
      return;
    }

    if (this.hasAdjacentSettlement(intersectionId)) {
      return;
    }

    if (this.getStateName() === "Turn" && !this.hasConnectedRoad(player.id, intersectionId)) {
      return;
    }

    if (this.getStateName() === "Turn") {
      this.spendResources(player.id, {
        Livestock: 1,
        Bread: 1,
        Timber: 1,
        Clay: 1,
      });
    }

    intersection.ownerId = player.id;
    intersection.level = "village";
    this.lastVillagePlacementByPlayerId[player.id] = intersectionId;
    this.updateHarborOwnership(player.id);

    this.sendAlert(`${player.name} placed a Village at ${intersectionId}.`);
    this.recalculateLongestRoad();

    if (this.getStateName() === "Initial Placement") {
      const placedCount = this.getPlayerIntersectionsByLevel(player.id, "village").length;
      if (placedCount === 2) {
        this.grantSecondSettlementResources(player.id, intersectionId);
      }
    }
  }

  tryUpgradeToCity(player, intersectionId) {
    const intersection = this.board.intersections.find((item) => item.id === intersectionId);
    if (!intersection || intersection.ownerId !== player.id || intersection.level !== "village") {
      return;
    }
    if (!this.canUpgradeCity(player)) {
      return;
    }
    this.spendResources(player.id, { Bread: 2, Stone: 3 });
    intersection.level = "city";
    this.sendAlert(`${player.name} upgraded ${intersectionId} to a City.`);
    this.recalculateLongestRoad();
  }

  tryPlaceRoad(player, roadId) {
    const road = this.board.roads.find((item) => item.id === roadId);
    if (!road || road.ownerId) {
      return;
    }

    if (!this.canPlaceRoad(player)) {
      return;
    }

    if (this.getStateName() === "Initial Placement") {
      const requiredVillage = this.lastVillagePlacementByPlayerId[player.id];
      if (road.a !== requiredVillage && road.b !== requiredVillage) {
        return;
      }
    } else if (!this.canConnectRoad(player.id, road)) {
      return;
    } else {
      if (this.pendingFreeRoadsByPlayerId[player.id] > 0) {
        this.pendingFreeRoadsByPlayerId[player.id] -= 1;
      } else {
        this.spendResources(player.id, {
          Timber: 1,
          Clay: 1,
        });
      }
    }

    road.ownerId = player.id;
    this.roadsByPlayerId[player.id].push(roadId);
    this.lastVillagePlacementByPlayerId[player.id] = null;
    this.sendAlert(`${player.name} placed a Road at ${roadId}.`);
    this.recalculateLongestRoad();

    if (this.getStateName() === "Initial Placement") {
      this.initialPlacementIndex += 1;
      if (this.initialPlacementIndex >= this.initialPlacementQueue.length) {
        this.sendAlert("Initial placement complete. Moving to the main turns.");
        this.gotoNextState();
      }
    }
  }

  endTurn(player) {
    if (!this.canEndTurn(player)) {
      return;
    }
    this.pendingFreeRoadsByPlayerId[player.id] = 0;
    this.gotoNextState();
  }

  advanceTurn() {
    if (this.turnOrder.length === 0) {
      return;
    }
    this.turnOrderIndex = (this.turnOrderIndex + 1) % this.turnOrder.length;
    if (this.turnOrderIndex === 0) {
      this.round += 1;
    }
  }

  getCurrentTurnPlayer() {
    return this.turnOrder[this.turnOrderIndex];
  }

  isCurrentTurnPlayer(player) {
    const current = this.getCurrentTurnPlayer();
    return current && current.id === player.id;
  }

  isSettler(player) {
    return player.role && player.role.name === "Settler";
  }

  rollAndDistributeResources() {
    if (this.rollDoneThisTurn) {
      return;
    }

    const dieA = Random.randInt(1, 6);
    const dieB = Random.randInt(1, 6);
    const total = dieA + dieB;
    this.rollDoneThisTurn = true;
    this.sendAlert(`Rolled ${dieA} + ${dieB} = ${total}.`);

    if (total === 7) {
      const current = this.getCurrentTurnPlayer();
      this.handleSevenRoll(current);
      return;
    }

    const producingHexes = this.board.hexes.filter((hex) => hex.token === total);
    if (!producingHexes.length) {
      return;
    }

    const settlers = this.turnOrder;
    for (const hex of producingHexes) {
      if (!hex.resource || this.robberHexId === hex.id) {
        continue;
      }
      for (const intersectionId of hex.intersections) {
        const intersection = this.board.intersections.find((item) => item.id === intersectionId);
        if (!intersection || !intersection.ownerId || !intersection.level) {
          continue;
        }
        const amount = intersection.level === "city" ? 2 : 1;
        this.resourceByPlayerId[intersection.ownerId][hex.resource] += amount;
      }
    }

    for (const player of settlers) {
      const totalResources = this.totalResources(player.id);
      if (totalResources > 0) {
        this.sendAlert(`${player.name} now has ${totalResources} resource cards.`);
      }
    }
  }

  handleSevenRoll(player) {
    if (!player) {
      return;
    }
    for (const target of this.turnOrder) {
      const total = this.totalResources(target.id);
      if (total > 7) {
        const toDiscard = Math.floor(total / 2);
        this.pendingDiscardByPlayerId[target.id] = toDiscard;
        this.sendAlert(`${target.name} must discard ${toDiscard} resources.`);
      }
    }
    this.pendingRobberPlayerId = player.id;
  }

  discardOneResource(player, resource) {
    if (!this.canDiscardResource(player)) {
      return;
    }
    if (!RESOURCE_TYPES.includes(resource)) {
      return;
    }
    if (this.resourceByPlayerId[player.id][resource] <= 0) {
      return;
    }
    this.resourceByPlayerId[player.id][resource] -= 1;
    this.pendingDiscardByPlayerId[player.id] -= 1;
    this.sendAlert(
      `${player.name} discards 1 ${resource}. ${this.pendingDiscardByPlayerId[player.id]} remaining.`
    );
  }

  moveRobber(player, hexId) {
    if (!this.canMoveRobber(player)) {
      return;
    }
    const hex = this.board.hexes.find((item) => item.id === hexId);
    if (!hex || hex.id === this.robberHexId) {
      return;
    }
    this.robberHexId = hex.id;
    this.pendingRobberPlayerId = null;
    this.pendingStealPlayerId = player.id;
    this.pendingStealCandidates = this.getStealCandidates(player.id, hex.id);
    this.sendAlert(`${player.name} moved the robber to ${hex.id}.`);
    if (!this.pendingStealCandidates.length) {
      this.pendingStealPlayerId = null;
      this.sendAlert("No eligible player to steal from.");
    }
  }

  stealResourceAfterRobber(player, targetId) {
    if (!this.canStealResource(player)) {
      return;
    }
    if (!this.pendingStealCandidates.includes(targetId)) {
      return;
    }

    const resourcePool = [];
    for (const resource of RESOURCE_TYPES) {
      const amt = this.resourceByPlayerId[targetId][resource];
      for (let i = 0; i < amt; i++) {
        resourcePool.push(resource);
      }
    }
    if (!resourcePool.length) {
      this.pendingStealPlayerId = null;
      this.pendingStealCandidates = [];
      return;
    }

    const stolen = Random.randArrayVal(resourcePool);
    this.resourceByPlayerId[targetId][stolen] -= 1;
    this.resourceByPlayerId[player.id][stolen] += 1;
    this.pendingStealPlayerId = null;
    this.pendingStealCandidates = [];
    const targetPlayer = this.getPlayer(targetId, true);
    this.sendAlert(`${player.name} stole 1 random resource from ${targetPlayer.name}.`);
  }

  buyDevelopmentCard(player) {
    if (!this.canBuyDevelopmentCard(player)) {
      return;
    }
    const drawn = this.devDeck.pop();
    this.spendResources(player.id, { Livestock: 1, Bread: 1, Stone: 1 });
    if (drawn === "Victory Point") {
      this.victoryPointDevCardsByPlayerId[player.id] += 1;
      this.sendAlert(`${player.name} bought a Development Card.`);
      return;
    }
    this.newDevelopmentCardsByPlayerId[player.id][drawn] += 1;
    this.sendAlert(`${player.name} bought a Development Card.`);
  }

  playKnight(player) {
    if (!this.canPlayKnight(player)) {
      return;
    }
    this.developmentCardsByPlayerId[player.id]["Knight"] -= 1;
    this.playedKnightsByPlayerId[player.id] += 1;
    this.playedDevCardThisTurnByPlayerId[player.id] = true;
    this.pendingRobberPlayerId = player.id;
    this.recalculateLargestArmy();
    this.sendAlert(`${player.name} played Knight.`);
  }

  playRoadBuilding(player) {
    if (!this.canPlayRoadBuilding(player)) {
      return;
    }
    this.developmentCardsByPlayerId[player.id]["Road Building"] -= 1;
    this.playedDevCardThisTurnByPlayerId[player.id] = true;
    this.pendingFreeRoadsByPlayerId[player.id] = 2;
    this.sendAlert(`${player.name} played Road Building and can place 2 free roads.`);
  }

  playYearOfPlenty(player, target) {
    if (!this.canPlayYearOfPlenty(player)) {
      return;
    }
    const [a, b] = target.split("+");
    if (!RESOURCE_TYPES.includes(a) || !RESOURCE_TYPES.includes(b)) {
      return;
    }
    this.developmentCardsByPlayerId[player.id]["Year Of Plenty"] -= 1;
    this.playedDevCardThisTurnByPlayerId[player.id] = true;
    this.resourceByPlayerId[player.id][a] += 1;
    this.resourceByPlayerId[player.id][b] += 1;
    this.sendAlert(`${player.name} took ${a} and ${b} with Year Of Plenty.`);
  }

  playMonopoly(player, resource) {
    if (!this.canPlayMonopoly(player) || !RESOURCE_TYPES.includes(resource)) {
      return;
    }
    this.developmentCardsByPlayerId[player.id]["Monopoly"] -= 1;
    this.playedDevCardThisTurnByPlayerId[player.id] = true;
    let total = 0;
    for (const target of this.turnOrder) {
      if (target.id === player.id) {
        continue;
      }
      const amt = this.resourceByPlayerId[target.id][resource];
      if (amt > 0) {
        this.resourceByPlayerId[target.id][resource] = 0;
        this.resourceByPlayerId[player.id][resource] += amt;
        total += amt;
      }
    }
    this.sendAlert(`${player.name} monopolized ${resource} and collected ${total}.`);
  }

  maritimeTrade(player, trade) {
    if (!this.canMaritimeTrade(player)) {
      return;
    }
    if (!this.canExecuteTrade(player.id, trade)) {
      return;
    }
    const [givePart, receivePart] = trade.split("=>");
    const [giveResource, giveAmountString] = givePart.split(":");
    const [receiveResource] = receivePart.split(":");
    const giveAmount = parseInt(giveAmountString);
    this.resourceByPlayerId[player.id][giveResource] -= giveAmount;
    this.resourceByPlayerId[player.id][receiveResource] += 1;
    this.sendAlert(
      `${player.name} traded ${giveAmount} ${giveResource} for 1 ${receiveResource}.`
    );
  }

  makeEmptyResources() {
    return {
      Livestock: 0,
      Bread: 0,
      Timber: 0,
      Clay: 0,
      Stone: 0,
    };
  }

  makeEmptyDevCards() {
    return {
      Knight: 0,
      "Road Building": 0,
      "Year Of Plenty": 0,
      Monopoly: 0,
    };
  }

  buildYearPlentyTargets() {
    const targets = [];
    for (const a of RESOURCE_TYPES) {
      for (const b of RESOURCE_TYPES) {
        if (!targets.includes(`${a}+${b}`)) {
          targets.push(`${a}+${b}`);
        }
      }
    }
    return targets;
  }

  buildAllTradeTargets() {
    const targets = [];
    for (const give of RESOURCE_TYPES) {
      for (const receive of RESOURCE_TYPES) {
        if (give === receive) {
          continue;
        }
        for (const ratio of [2, 3, 4]) {
          targets.push(`${give}:${ratio}=>${receive}:1`);
        }
      }
    }
    return targets;
  }

  canExecuteTrade(playerId, trade) {
    const [givePart, receivePart] = trade.split("=>");
    const [giveResource, giveAmountString] = givePart.split(":");
    const [receiveResource] = receivePart.split(":");
    const giveAmount = parseInt(giveAmountString);
    if (!RESOURCE_TYPES.includes(giveResource) || !RESOURCE_TYPES.includes(receiveResource)) {
      return false;
    }
    if (giveResource === receiveResource) {
      return false;
    }
    if (this.resourceByPlayerId[playerId][giveResource] < giveAmount) {
      return false;
    }
    return giveAmount === this.getTradeRatio(playerId, giveResource);
  }

  getTradeRatio(playerId, resource) {
    let ratio = 4;
    for (const harborType of this.harborsByPlayerId[playerId]) {
      if (harborType === "3:1") {
        ratio = Math.min(ratio, 3);
      } else if (harborType === `${resource} 2:1`) {
        ratio = Math.min(ratio, 2);
      }
    }
    return ratio;
  }

  totalResources(playerId) {
    return RESOURCE_TYPES.reduce(
      (acc, resource) => acc + this.resourceByPlayerId[playerId][resource],
      0
    );
  }

  canAfford(playerId, cost) {
    const resources = this.resourceByPlayerId[playerId];
    for (const key of Object.keys(cost)) {
      if ((resources[key] || 0) < cost[key]) {
        return false;
      }
    }
    return true;
  }

  spendResources(playerId, cost) {
    const resources = this.resourceByPlayerId[playerId];
    for (const key of Object.keys(cost)) {
      resources[key] -= cost[key];
    }
  }

  makeRoadId(a, b) {
    const aNum = parseInt(String(a).replace("I", ""));
    const bNum = parseInt(String(b).replace("I", ""));
    const min = Math.min(aNum, bNum);
    const max = Math.max(aNum, bNum);
    return `R${min}-${max}`;
  }

  getPlayerIntersectionsByLevel(playerId, level) {
    return this.board.intersections
      .filter((item) => item.ownerId === playerId && item.level === level)
      .map((item) => item.id);
  }

  hasAdjacentSettlement(intersectionId) {
    const intersection = this.board.intersections.find((i) => i.id === intersectionId);
    for (const neighborId of intersection.adjacentIntersections) {
      const neighbor = this.board.intersections.find((i) => i.id === neighborId);
      if (neighbor.level) {
        return true;
      }
    }
    return false;
  }

  hasConnectedRoad(playerId, intersectionId) {
    for (const road of this.board.roads) {
      if (road.ownerId !== playerId) {
        continue;
      }
      if (road.a === intersectionId || road.b === intersectionId) {
        return true;
      }
    }
    return false;
  }

  canConnectRoad(playerId, road) {
    const endpoints = [road.a, road.b];
    for (const endpoint of endpoints) {
      const intersection = this.board.intersections.find((i) => i.id === endpoint);
      if (intersection.ownerId === playerId) {
        return true;
      }
    }
    for (const existing of this.board.roads) {
      if (existing.ownerId !== playerId) {
        continue;
      }
      for (const endpoint of endpoints) {
        if (existing.a === endpoint || existing.b === endpoint) {
          const intersection = this.board.intersections.find((i) => i.id === endpoint);
          if (!intersection.ownerId || intersection.ownerId === playerId) {
            return true;
          }
        }
      }
    }
    return false;
  }

  grantSecondSettlementResources(playerId, intersectionId) {
    const intersection = this.board.intersections.find((item) => item.id === intersectionId);
    for (const hexId of intersection.adjacentHexes) {
      const hex = this.board.hexes.find((item) => item.id === hexId);
      if (hex.resource) {
        this.resourceByPlayerId[playerId][hex.resource] += 1;
      }
    }
    const player = this.getPlayer(playerId, true);
    this.sendAlert(`${player.name} received starting resources from second settlement.`);
  }

  updateHarborOwnership(playerId) {
    const harbors = new Set();
    for (const intersection of this.board.intersections) {
      if (intersection.ownerId !== playerId) {
        continue;
      }
      if (intersection.harborId) {
        const harbor = this.board.harbors.find((item) => item.id === intersection.harborId);
        harbors.add(harbor.type);
      }
    }
    this.harborsByPlayerId[playerId] = Array.from(harbors);
  }

  mergeNewDevCards(playerId) {
    for (const key of Object.keys(this.newDevelopmentCardsByPlayerId[playerId])) {
      const amount = this.newDevelopmentCardsByPlayerId[playerId][key];
      if (amount > 0) {
        this.developmentCardsByPlayerId[playerId][key] += amount;
        this.newDevelopmentCardsByPlayerId[playerId][key] = 0;
      }
    }
  }

  getStealCandidates(playerId, robberHexId) {
    const hex = this.board.hexes.find((item) => item.id === robberHexId);
    const candidates = new Set();
    for (const intersectionId of hex.intersections) {
      const intersection = this.board.intersections.find((item) => item.id === intersectionId);
      if (
        intersection.ownerId &&
        intersection.ownerId !== playerId &&
        this.totalResources(intersection.ownerId) > 0
      ) {
        candidates.add(intersection.ownerId);
      }
    }
    return Array.from(candidates);
  }

  recalculateLargestArmy() {
    let best = { playerId: null, size: 2 };
    for (const player of this.turnOrder) {
      const size = this.playedKnightsByPlayerId[player.id] || 0;
      if (size > best.size) {
        best = { playerId: player.id, size };
      } else if (size === best.size && this.largestArmyHolderId === player.id) {
        best = { playerId: player.id, size };
      }
    }
    this.largestArmyHolderId = best.playerId;
    this.largestArmySize = best.size;
  }

  recalculateLongestRoad() {
    let bestLength = 4;
    let bestPlayerId = null;
    for (const player of this.turnOrder) {
      const length = this.getLongestRoadForPlayer(player.id);
      if (length > bestLength) {
        bestLength = length;
        bestPlayerId = player.id;
      } else if (length === bestLength && this.longestRoadHolderId === player.id) {
        bestPlayerId = player.id;
      }
    }
    this.longestRoadHolderId = bestPlayerId;
    this.longestRoadLength = bestLength;
  }

  getLongestRoadForPlayer(playerId) {
    const playerRoads = this.board.roads.filter((road) => road.ownerId === playerId);
    if (!playerRoads.length) {
      return 0;
    }
    const roadById = {};
    for (const road of playerRoads) {
      roadById[road.id] = road;
    }
    const adjacency = {};
    for (const road of playerRoads) {
      adjacency[road.id] = [];
    }
    for (const a of playerRoads) {
      for (const b of playerRoads) {
        if (a.id === b.id) {
          continue;
        }
        if (
          a.a === b.a ||
          a.a === b.b ||
          a.b === b.a ||
          a.b === b.b
        ) {
          const shared = [a.a, a.b].find((x) => x === b.a || x === b.b);
          const inter = this.board.intersections.find((item) => item.id === shared);
          if (inter.ownerId && inter.ownerId !== playerId) {
            continue;
          }
          adjacency[a.id].push(b.id);
        }
      }
    }
    let best = 0;
    const dfs = (roadId, used) => {
      best = Math.max(best, used.size);
      for (const next of adjacency[roadId]) {
        if (used.has(next)) {
          continue;
        }
        used.add(next);
        dfs(next, used);
        used.delete(next);
      }
    };
    for (const road of playerRoads) {
      const used = new Set([road.id]);
      dfs(road.id, used);
    }
    return best;
  }

  getStateInfo(state) {
    const info = super.getStateInfo(state);
    info.extraInfo = {
      board: JSON.parse(JSON.stringify(this.board)),
      round: this.round,
      turnPlayerId: this.getCurrentTurnPlayer()?.id ?? null,
      turnOrder: this.turnOrder.map((player) => player.id),
      resources: JSON.parse(JSON.stringify(this.resourceByPlayerId)),
      devCards: JSON.parse(JSON.stringify(this.developmentCardsByPlayerId)),
      newDevCards: JSON.parse(JSON.stringify(this.newDevelopmentCardsByPlayerId)),
      playedKnights: JSON.parse(JSON.stringify(this.playedKnightsByPlayerId)),
      playedDevCardThisTurnByPlayerId: JSON.parse(
        JSON.stringify(this.playedDevCardThisTurnByPlayerId)
      ),
      largestArmyHolderId: this.largestArmyHolderId,
      largestArmySize: this.largestArmySize,
      longestRoadHolderId: this.longestRoadHolderId,
      longestRoadLength: this.longestRoadLength,
      robberHexId: this.robberHexId,
      pendingDiscardByPlayerId: JSON.parse(JSON.stringify(this.pendingDiscardByPlayerId)),
      pendingRobberPlayerId: this.pendingRobberPlayerId,
      pendingStealPlayerId: this.pendingStealPlayerId,
      pendingStealCandidates: this.pendingStealCandidates.slice(),
      pendingFreeRoadsByPlayerId: JSON.parse(
        JSON.stringify(this.pendingFreeRoadsByPlayerId)
      ),
      devDeckRemaining: this.devDeck.length,
      harborsByPlayerId: JSON.parse(JSON.stringify(this.harborsByPlayerId)),
      initialPlacement: {
        index: this.initialPlacementIndex,
        queue: this.initialPlacementQueue.map((player) => player.id),
      },
      costs: {
        village: {
          Livestock: 1,
          Bread: 1,
          Timber: 1,
          Clay: 1,
        },
        road: {
          Timber: 1,
          Clay: 1,
        },
        city: {
          Bread: 2,
          Stone: 3,
        },
        development: {
          Livestock: 1,
          Bread: 1,
          Stone: 1,
        },
      },
      placeholders: {
        resources: {
          Livestock: "Sheep",
          Bread: "Bread",
          Timber: "Lumberjack",
          Clay: "Potter",
          Stone: "Mason",
        },
        buildables: {
          Village: "Villager",
          Road: "Courier",
          City: "Mayor",
        },
      },
    };
    return info;
  }

  checkWinConditions() {
    const winners = new Winners(this);
    let finished = false;

    for (const player of this.turnOrder) {
      const villageCount = this.getPlayerIntersectionsByLevel(player.id, "village").length;
      const cityCount = this.getPlayerIntersectionsByLevel(player.id, "city").length;
      const vpDev = this.victoryPointDevCardsByPlayerId[player.id] || 0;
      const hasLongestRoad = this.longestRoadHolderId === player.id ? 2 : 0;
      const hasLargestArmy = this.largestArmyHolderId === player.id ? 2 : 0;
      const score =
        villageCount +
        cityCount * 2 +
        hasLongestRoad +
        hasLargestArmy +
        vpDev;
      if (score >= 10) {
        winners.addPlayer(player, player.name);
        finished = true;
      }
    }

    if (!finished && this.round > this.maxRounds) {
      const ranking = this.turnOrder
        .map((player) => {
          const villageCount = this.getPlayerIntersectionsByLevel(player.id, "village").length;
          const cityCount = this.getPlayerIntersectionsByLevel(player.id, "city").length;
          const vpDev = this.victoryPointDevCardsByPlayerId[player.id] || 0;
          const hasLongestRoad = this.longestRoadHolderId === player.id ? 2 : 0;
          const hasLargestArmy = this.largestArmyHolderId === player.id ? 2 : 0;
          return {
            player,
            score: villageCount + cityCount * 2 + hasLongestRoad + hasLargestArmy + vpDev,
          };
        })
        .sort((a, b) => b.score - a.score);

      if (ranking.length > 0) {
        winners.addPlayer(ranking[0].player, ranking[0].player.name);
      }
      finished = true;
    }

    winners.determinePlayers();
    return [finished, winners];
  }

  get devDeck() {
    if (!this._devDeck) {
      this._devDeck = Random.randomizeArray(DEV_CARDS.slice());
    }
    return this._devDeck;
  }
};
