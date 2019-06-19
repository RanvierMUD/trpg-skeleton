'use strict';

const { CommandType } = require('ranvier');

class CommandParser {
  /**
   * Parse a given string to find the resulting command/arguments
   * @param {GameState} state
   * @param {string} data
   * @param {Player} player
   * @return {{
   *   type: CommandType,
   *   command: Command,
   *   skill: Skill,
   *   channel: Channel,
   *   args: string,
   *   originalCommand: string
   * }}
   */
  static parse(state, data, player) {
    data = data.trim();

    const parts = data.split(' ');

    const command = parts.shift().toLowerCase();
    if (!command.length) {
      throw new InvalidCommandError();
    }

    const args = parts.join(' ');

    // Same with 'i' and inventory.
    if (command === 'i') {
      return {
        type: CommandType.COMMAND,
        command: state.CommandManager.get('inventory'),
        args: args
      };
    }

    // see if they matched a direction for a movement command
    const direction = this.checkMovement(player, command);
    if (direction) {
      return {
        type: CommandType.MOVEMENT,
        args,
        originalCommand: command,
        roomExit: player.room.getExits().find(roomExit => roomExit.direction === direction) || false,
      };
    }

    const found = state.CommandManager.get(command);
    if (found && !found.metadata.combatOnly) {
      return {
        type: CommandType.COMMAND,
        command: found,
        args,
        originalCommand: command
      };
    }

    throw new InvalidCommandError();
  }

  /**
   * Check command for partial match on primary directions, or exact match on secondary name or abbreviation
   * @param {Player} player
   * @param {string} command
   * @return {?string}
   */
  static checkMovement(player, command)
  {
    const primaryDirections = ['north', 'south', 'east', 'west', 'up', 'down'];

    for (const direction of primaryDirections) {
      if (direction.indexOf(command) === 0) {
        return direction;
      }
    }

    const secondaryDirections = [
      { abbr: 'ne', name: 'northeast' },
      { abbr: 'nw', name: 'northwest' },
      { abbr: 'se', name: 'southeast' },
      { abbr: 'sw', name: 'southwest' }
    ];

    for (const direction of secondaryDirections) {
      if (direction.abbr === command || direction.name.indexOf(command) === 0) {
        return direction.name;
      }
    }

    const otherExit = player.room.getExits().find(roomExit => roomExit.direction === command);

    return otherExit ? otherExit.direction : null;
  }
}
exports.CommandParser = CommandParser;

/**
 * Used when the player enters a bad command
 * @extends Error
 */
class InvalidCommandError extends Error {}
/**
 * Used when the player tries a command they don't have access to
 * @extends Error
 */
class RestrictedCommandError extends Error {}

exports.InvalidCommandError = InvalidCommandError;
exports.RestrictedCommandError = RestrictedCommandError;

