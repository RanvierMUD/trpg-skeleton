'use strict';


module.exports = {
  listeners: {
    combatEndTurn: state => function () {
      // reset movement at end of turn
      this.setAttributeToMax('movement');
    },

    combatStartTurn: state => function () {
      this.combatData.controller.menu.showTurnStart(this);
    }
  },
};
