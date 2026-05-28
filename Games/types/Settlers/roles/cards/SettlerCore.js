const Card = require("../../Card");

module.exports = class SettlerCore extends Card {
  constructor(role) {
    super(role);

    this.meetings = {
      "Discard Resource": {
        actionName: "Discard Resource",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.resourceTargets,
        action: {
          item: this,
          run: function () {
            this.game.discardOneResource(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canDiscardResource(this.player);
        },
      },
      "Move Robber": {
        actionName: "Move Robber",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.hexIds,
        action: {
          item: this,
          run: function () {
            this.game.moveRobber(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canMoveRobber(this.player);
        },
      },
      "Steal Resource": {
        actionName: "Steal Resource",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.playerTargets,
        action: {
          item: this,
          run: function () {
            this.game.stealResourceAfterRobber(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canStealResource(this.player);
        },
      },
      "Place Village": {
        actionName: "Choose Intersection",
        states: ["Initial Placement", "Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.intersectionIds,
        action: {
          item: this,
          run: function () {
            this.game.tryPlaceVillage(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canPlaceVillage(this.player);
        },
      },
      "Upgrade To City": {
        actionName: "Choose Village",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.intersectionIds,
        action: {
          item: this,
          run: function () {
            this.game.tryUpgradeToCity(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canUpgradeCity(this.player);
        },
      },
      "Place Road": {
        actionName: "Choose Edge",
        states: ["Initial Placement", "Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.roadIds,
        action: {
          item: this,
          run: function () {
            this.game.tryPlaceRoad(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canPlaceRoad(this.player);
        },
      },
      "Buy Development Card": {
        actionName: "Buy Development Card",
        states: ["Turn"],
        flags: ["voting"],
        targets: ["Buy"],
        action: {
          item: this,
          run: function () {
            this.game.buyDevelopmentCard(this.actor);
          },
        },
        shouldMeet: function () {
          return this.game.canBuyDevelopmentCard(this.player);
        },
      },
      "Play Knight": {
        actionName: "Play Knight",
        states: ["Turn"],
        flags: ["voting"],
        targets: ["Play Knight"],
        action: {
          item: this,
          run: function () {
            this.game.playKnight(this.actor);
          },
        },
        shouldMeet: function () {
          return this.game.canPlayKnight(this.player);
        },
      },
      "Play Road Building": {
        actionName: "Play Road Building",
        states: ["Turn"],
        flags: ["voting"],
        targets: ["Play Road Building"],
        action: {
          item: this,
          run: function () {
            this.game.playRoadBuilding(this.actor);
          },
        },
        shouldMeet: function () {
          return this.game.canPlayRoadBuilding(this.player);
        },
      },
      "Play Year Of Plenty": {
        actionName: "Choose Resources",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.yearPlentyTargets,
        action: {
          item: this,
          run: function () {
            this.game.playYearOfPlenty(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canPlayYearOfPlenty(this.player);
        },
      },
      "Play Monopoly": {
        actionName: "Choose Resource Type",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.resourceTargets,
        action: {
          item: this,
          run: function () {
            this.game.playMonopoly(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canPlayMonopoly(this.player);
        },
      },
      "Maritime Trade": {
        actionName: "Select Trade",
        states: ["Turn"],
        flags: ["voting"],
        inputType: "custom",
        targets: this.game.tradeTargetsAll,
        action: {
          item: this,
          run: function () {
            this.game.maritimeTrade(this.actor, this.target);
          },
        },
        shouldMeet: function () {
          return this.game.canMaritimeTrade(this.player);
        },
      },
      "End Turn": {
        actionName: "End Turn",
        states: ["Turn"],
        flags: ["voting"],
        targets: ["End Turn"],
        action: {
          item: this,
          run: function () {
            this.game.endTurn(this.actor);
          },
        },
        shouldMeet: function () {
          return this.game.canEndTurn(this.player);
        },
      },
    };
  }
};
