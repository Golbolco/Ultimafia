const Role = require("../../Role");

module.exports = class Settler extends Role {
  constructor(player, data) {
    super("Settler", player, data);

    this.alignment = "Settler";
    this.cards = ["TownCore", "SettlerCore"];
  }
};
