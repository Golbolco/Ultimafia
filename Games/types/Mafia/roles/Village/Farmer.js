const Role = require("../../Role");

module.exports = class Farmer extends Role {
  constructor(player, data) {
    super("Farmer", player, data);
    this.alignment = "Village";
    this.cards = [
      "VillageCore",
      "WinWithFaction",
      "MeetingFaction",
      "ReceiveBread",
      //"FamineStarter",
      "FamineImmune",
    ];
  }
};
