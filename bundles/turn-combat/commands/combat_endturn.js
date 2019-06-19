'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  command: state => (args, player) => {
    const { onTurn, controller } = player.combatData;

    if (!onTurn) {
      return B.sayAt(player, "It's not your turn.");
    }

    controller.nextTurn();
  },
  metadata: {
    combatOnly: true,
  },
};

