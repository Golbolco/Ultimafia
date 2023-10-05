const Card = require("../../Card");
const Action = require("../../Action");
const { PRIORITY_NIGHT_EXORCISE } = require("../../const/Priority");

module.exports = class NightExorcist extends Card {
  constructor(role) {
    super(role);

    this.meetings = {
      Block: {
        states: ["Night"],
        flags: ["voting"],
        targets: { include: ["dead"], exclude: ["alive", "self"] },
        action: {
          labels: ["exorcise"],
          priority: PRIORITY_NIGHT_EXORCISE,
          run: function () {
            if (!this.dominates()) {
              return;
            }

            this.actor.role.exorcised = true;
            this.target.exorcise("basic", this.actor);
          },
        },
      },
    };
  }
};
