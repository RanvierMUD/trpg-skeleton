'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  command: state => (args, player) => {
    player.combatData.controller.menu.showMenu(player);
  },
  metadata: {
    combatOnly: true,
  },
};

