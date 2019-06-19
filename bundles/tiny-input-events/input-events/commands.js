'use strict';

const { Broadcast: B, CommandType, Logger, PlayerRoles } = require('ranvier');
const { NoPartyError, NoRecipientError, NoMessageError } = require('ranvier').Channel;
const {
  CommandParser,
  InvalidCommandError,
  RestrictedCommandError,
} = require('../../../lib/CommandParser');

module.exports = {
  event: state => player => {
    player.socket.once('data', data => {
      function loop () {
        player.socket.emit('commands', player);
      }
      data = data.toString().trim();

      if (!data.length) {
        B.prompt(player);
        return loop();
      }

      try {
        if (player.combatData && player.combatData.controller) {
          player.combatData.controller.parseInput(player, data);
          B.prompt(player);
          return loop();
        }

        const result = CommandParser.parse(state, data, player);
        if (!result) {
          throw null;
        }

        switch (result.type) {
          case CommandType.MOVEMENT: {
            player.emit('move', result);
            break;
          }

          case CommandType.COMMAND: {
            const { requiredRole = PlayerRoles.PLAYER } = result.command;
            if (requiredRole > player.role) {
              throw new RestrictedCommandError();
            }
            result.command.execute(result.args, player, result.originalCommand);
            break;
          }
        }
      } catch (error) {
        switch(true) {
          case error instanceof InvalidCommandError:
            // check to see if room has a matching context-specific command
            const roomCommands = player.room.getMeta('commands');
            const [commandName, ...args] = data.split(' ');
            if (roomCommands && roomCommands.includes(commandName)) {
              player.room.emit('command', player, commandName, args.join(' '));
            } else {
              B.sayAt(player, "Huh?");
              Logger.warn(`WARNING: Player tried non-existent command '${data}'`);
            }
            break;
          case error instanceof RestrictedCommandError:
            B.sayAt(player, "You can't do that.");
            break;
          default:
            Logger.error(error);
        }
      }

      B.prompt(player);
      loop();
    });
  }
};

