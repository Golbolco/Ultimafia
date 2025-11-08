const Role = require("../../Role");

module.exports = class Admiral extends Role {
  constructor(player, data) {
    super("Admiral", player, data);

    this.alignment = "Navy";
    this.cards = ["TownCore", "WinIfFleetDominates"];
  }
};

