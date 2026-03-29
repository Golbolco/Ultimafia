const Role = require("../../Role");

module.exports = class Tutor extends Role {
  constructor(player, data) {
    super("Tutor", player, data);

    this.alignment = "Village";
    this.cards = [
      "VillageCore",
      "WinWithFaction",
      "TutorTarget",
    ];
  }
};