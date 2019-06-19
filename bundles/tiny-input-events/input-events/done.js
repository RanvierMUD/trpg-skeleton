'use strict';

const { Broadcast, Logger } = require('ranvier');

/**
 * Login is done, allow the player to actually execute commands
 */
module.exports = {
  event: state => (socket, args) => {
    const player = args.player;
    player.hydrate(state);

    state.CommandManager.get('look').execute(null, player);
    Broadcast.prompt(player);
    player.socket.emit('commands', player);
    player.emit('login');
  }
};

