const Card = require("../../Card");

module.exports = class WinIfFleetDominates extends Card {
  constructor(role) {
    super(role);

    this.winCheck = {
      priority: 0,
      check: function (counts, winners, aliveCount) {
        const game = this.game;

        if (!game || game.phase !== "battle") return;

        const survivors = game
          .getActiveNavyPlayerIds()
          .filter((playerId) => game.hasShipsRemaining(playerId));

        if (survivors.length <= 1 && survivors.includes(this.player.id)) {
          winners.addPlayer(this.player, this.name);
        }
      },
    };
  }
};

