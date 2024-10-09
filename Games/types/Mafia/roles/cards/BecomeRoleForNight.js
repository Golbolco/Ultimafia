const Card = require("../../Card");

module.exports = class BecomeRoleForNight extends Card {
  constructor(role) {
    super(role);

    this.meetings = {
      "Copy Actions": {
        states: ["Dusk", "Sunset"],
        flags: ["voting", "instant", "mustAct"],
        action: {
          run: function () {
            let currRole = this.actor.role.name;
            let currModifiers = this.actor.role.modifier;
            let currData = this.actor.role.data;

            if (
              this.game.getRoleAlignment(this.target.role.name) == "Independent"
            ) {
              return;
            }

            this.actor.holdItem(
              "ReturnToRole",
              currRole,
              currModifiers,
              currData,
              this.target.role.name
            );
            this.actor.setRole(
              `${this.target.role.name}:${this.target.role.modifier}`,
              this.target.role.data,
              true,
              true,
              false,
              "No Change"
            );
            //this.actor.role.priorityOffset = -1;

            if (this.actor.role.name != currRole) {
              this.actor.role.name = currRole;
              this.actor.role.appearance.death = currRole;
              this.actor.role.appearance.reveal = currRole;
              this.actor.role.appearance.investigate = currRole;
              this.actor.role.appearance.condemn = currRole;
              this.actor.role.alignment = this.game.getRoleAlignment(currRole);
            }
          },
        },
      },
    };

    this.stateMods = {
      Sunset: {
        type: "add",
        index: 6,
        length: 1000 * 60,
        shouldSkip: function () {
          for (let player of this.game.players) {
            if (
              this.game.getRoleTags(player.role.name).includes("Copy Actions")
            ) {
              return false;
            }
          }
          return true;
        },
      },
    };
  }
};