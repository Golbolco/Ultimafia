const Player = require("../../core/Player");
const deathMessages = require("./templates/death");

module.exports = class IroncladPlayer extends Player {
  constructor(user, game, isBot) {
    super(user, game, isBot);

    this.deathMessages = deathMessages;

    if (this.socket) {
      this.socket.on("placeShip", (data) => {
        try {
          this.game.handleShipPlacement(this.id, data);
        } catch (error) {
          console.error("Ironclad placeShip error:", error);
        }
      });

      this.socket.on("attackSquare", (data) => {
        try {
          this.game.handleAttack(this.id, data);
        } catch (error) {
          console.error("Ironclad attackSquare error:", error);
        }
      });
    }
  }
};

