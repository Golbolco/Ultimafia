const Card = require("../../Card");

module.exports = class IroncladCore extends Card {
  constructor(role) {
    super(role);

    this.meetings = {
      WarRoom: {
        states: ["*"],
        flags: ["group", "speech"],
      },
    };
  }
};

