const Role = require("../../Role");

module.exports = class Turkey extends Role {
  constructor(player, data) {
    super("Turkey", player, data);

    this.alignment = "Hostile";
    this.cards = [
      "VillageCore",
      "MeetingTurkey",
      "GiveTurkeyOnDeath",
      "FamineStarter",
      "FamineImmune",
      "WinIfOnlyTurkeyAlive",
    ];
  }
};
