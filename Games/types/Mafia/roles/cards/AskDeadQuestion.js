const Card = require("../../Card");
const Action = require("../../Action");
const {
  PRIORITY_DAY_DEFAULT,
  PRIORITY_INVESTIGATIVE_DEFAULT,
} = require("../../const/Priority");

module.exports = class AskDeadQuestion extends Card {
  constructor(role) {
    super(role);

    // here, mourner decides the question to ask
    this.meetings = {
      "Ask Question": {
        states: ["Day"],
        flags: ["voting"],
        inputType: "text",
        textOptions: {
          submit: "Ask",
        },
        action: {
          priority: PRIORITY_DAY_DEFAULT,
          run: function () {
            this.actor.role.data.question = this.target;
            this.actor.role.data.meetingName =
              'Answer Mourner asking "' + this.actor.role.data.question + '"';
            this.actor.role.mournerYes = 0;
            this.actor.role.mournerNo = 0;
            if (!this.actor.role.data.question) {
              return;
            }
            for (let player of this.game.players) {
              if (!player.alive) {
                player.holdItem("Mourned", {
                  mourner: this.actor,
                  question: this.actor.role.data.question,
                  meetingName: this.actor.role.data.meetingName,
                });
              }
            }
          },
        },
      },
    };
    /*
    this.actions = [
      // give mourned item to dead
      {
        // we want to give the village elimination the mourned item as well
        priority: PRIORITY_DAY_DEFAULT + 1,
        run: function () {
          if (!this.actor.alive) {
            return;
          }

          if (
            this.game.getStateName() !== "Day" &&
            this.game.getStateName() !== "Dusk"
          ) {
            return;
          }

          if (!this.actor.role.data.question) {
            return;
          }

          for (let player of this.game.players) {
            if (!player.alive) {
              player.holdItem("Mourned", {
                mourner: this.actor,
                question: this.actor.role.data.question,
                meetingName: this.actor.role.data.meetingName,
              });
            }
          }
        },
      },

      // collect the replies at night
      {
        priority: PRIORITY_INVESTIGATIVE_DEFAULT,
        run: function () {
          if (!this.actor.alive) {
            return;
          }

          if (
            this.game.getStateName() !== "Night" &&
            this.game.getStateName() !== "Dawn"
          ) {
            return;
          }

          if (!this.actor.role.data.question) {
            return;
          }

          let numYes = this.actor.role.mournerYes;
          let numNo = this.actor.role.mournerNo;

          let totalResponses = numYes + numNo;

          let percentNo = Math.round((numNo / totalResponses) * 100);
          let percentYes = Math.round((numYes / totalResponses) * 100);

          if (this.actor.hasEffect("FalseMode")) {
            if (totalResponses === 0) {
              percentYes = 100;
              percentNo = 0;
              totalResponses = totalResponses + 1;
            } else {
              let temp = percentNo;
              percentNo = percentYes;
              percentYes = temp;
            }
          }

          if (totalResponses === 0)
            this.actor.queueAlert(`You receive no responses from the dead.`);
          else
            this.actor.queueAlert(
              `The dead has replied with ${percentYes}% Yes's and ${percentNo}% No's to your question "${this.actor.role.data.question}".`
            );
        },
      },
    ];
*/

    this.listeners = {
      state: function (stateInfo) {
        if (stateInfo.name.match(/Day/)) {
        }
        if (!stateInfo.name.match(/Night/)) {
          return;
        }
        var action = new Action({
          actor: this.player,
          game: this.player.game,
          priority: PRIORITY_INVESTIGATIVE_DEFAULT + 1,
          run: function () {
            if (!this.actor.alive) {
              return;
            }

            if (!this.actor.role.data.question) {
              return;
            }

            let info = this.game.createInformation(
              "MournerInfo",
              this.actor,
              this.game
            );
            info.processInfo();
            var alert = `${info.getInfoFormated()}.`;
            this.actor.queueAlert(alert);
          },
        });

        this.game.queueAction(action);
      },
    };
  }
};
