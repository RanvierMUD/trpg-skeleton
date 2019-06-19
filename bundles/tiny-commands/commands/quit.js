'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  command: (state) => (args, player) => {
    player.save(() => {
      Broadcast.sayAt(player, "Goodbye!");
      state.PlayerManager.removePlayer(player, true);
    });
  }
};
