const Card = require("../../Card");
const Random = require("../../../../../lib/Random");

module.exports = class VampireAppearAsRoles extends Card {
  constructor(role) {
    super(role);

    const evilRoles = role.game.PossibleRoles.filter(
      (r) =>
        role.game.getRoleAlignment(r) === "Cult" ||
        role.game.getRoleAlignment(r) === "Mafia"
    );


    let randomNonVampire = evilRoles.filter((r) => r.split(":")[0] != "Vampire");


    if(randomNonVampire.length < 0) return;

    const randomEvilRole = Random.randArrayVal(randomNonVampire);

    const roleAppearance = randomEvilRole.split(":")[0];

    //const selfAppearance = role.name == "Miller" ? "Villager" : "real";

    

    this.appearance = {
      self: "real",
      reveal: "real",
      condemn: roleAppearance,
      death: roleAppearance,
      investigate: roleAppearance,
    };

    this.hideModifier = {
      condemn: true,
      investigate: true,
    };
  }
};
