const Card = require("../../Card");
const { PRIORITY_INVESTIGATIVE_DEFAULT } = require("../../const/Priority");

module.exports = class TutorTarget extends Card {
  constructor(role) {
    super(role);

    this.meetings = {
      Tutor: {
        states: ["Night"],
        flags: ["voting"],
        action: {
          labels: ["visit", "tutor"],
          ability: ["Information", "Conversion"],
          priority: PRIORITY_INVESTIGATIVE_DEFAULT,
          run: function () {
            if (this.target.role.alignment !== "Village") return;

            const game = this.game;
            const target = this.target;

            const infoRoles = game.getRolesByTag("Information").filter(
              (roleName) =>
                roleName !== "Tutor" &&
                roleName !== target.role.name
            );

            if (!infoRoles.length) return;

            const chosenRoleName =
              infoRoles[Math.floor(Math.random() * infoRoles.length)];

            if (!target.role.data.tutorOriginalRole) {
              target.role.data.tutorOriginalRole = target.role.name;
            }

            const RoleClass = game.getRoleClass(chosenRoleName);
            if (!RoleClass) return;

            game.changeRole(target, RoleClass, { alignment: "Village" });

            if (!target.role.data.tutorRevertQueued) {
              target.role.data.tutorRevertQueued = true;

              game.once("phaseBegin:Night", function () {
                game.once("phaseBegin:Day", function () {
                  if (!target.alive) return;

                  const originalRoleName = target.role.data.tutorOriginalRole;
                  if (!originalRoleName) return;

                  const OriginalClass = game.getRoleClass(originalRoleName);
                  if (OriginalClass) {
                    game.changeRole(target, OriginalClass, { alignment: "Village" });
                  }

                  target.role.data.tutorOriginalRole = null;
                  target.role.data.tutorRevertQueued = false;
                });
              });
            }

            game.once("phaseBegin:Day", function () {
              var alert = `:star: You have been tutored into ${chosenRoleName}!`;
              game.queueAlert(alert, 0, [target]);
            });
          },
        },
      },
    };
  }
};