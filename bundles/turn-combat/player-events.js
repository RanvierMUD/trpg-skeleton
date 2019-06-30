'use strict';

const { Broadcast } = require('ranvier');


module.exports = {
  listeners: {
    combatEndTurn: state => function () {
      // reset per-turn attributes at end of turn
      this.setAttributeToMax('movement');
      this.setAttributeToMax('attacks');
    },

    combatStartTurn: state => function () {
      this.combatData.controller.menu.showTurnStart(this);
    },

    hit: state => function (damage, target, finalAmount) {
      const { controller } = this.combatData;

      if (!controller) {
        return Broadcast.sayAt(this, `You deal ${finalAmount} ${damage.attribute} damage to ${target.name}`);
      }

      Broadcast.sayAtExcept(controller, `-> ${target.name} takes ${finalAmount} ${damage.attribute} damage.`, this);
    },

    damaged: state => function (damage, finalAmount) {
      const { controller } = this.combatData;

      if (damage.attacker === this) {
        return Broadcast.sayAt(this, `You use ${finalAmount} ${damage.attribute}.`);
        return;
      }

      if (!controller) {
        return Broadcast.sayAt(this, `You take ${finalAmount} damage.`);
      }

      if (damage.attacker) {
        Broadcast.sayAtExcept(controller, `-> ${damage.attacker.name} deals ${finalAmount} damage to ${this.name}!`, this);
        Broadcast.sayAt(this, `-> ${damage.attacker.name} deals ${finalAmount} damage to you!`);
      } else {
        Broadcast.sayAtExcept(controller, `-> ${this.name} takes ${finalAmount} damage!`, this);
        Broadcast.sayAt(this, `-> You take ${finalAmount} damage!`);
      }
    },
  },
};
