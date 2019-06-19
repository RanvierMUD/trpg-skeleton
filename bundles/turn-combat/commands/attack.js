'use strict';

const { Broadcast: B } = require('ranvier');
const CombatController = require('../lib/CombatController');

module.exports = {
  command: state => (args, player) => {
    const target = [...player.room.npcs][0];
    const controller = new CombatController(state);

    controller.beginCombat(player, target);
  }
};
