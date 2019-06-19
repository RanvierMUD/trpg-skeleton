'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  command: state => (args, player) => {
    player.combatData.controller.map.draw(player);
  },
  metadata: {
    combatOnly: true,
  },
};

