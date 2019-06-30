'use strict';

const { Broadcast: B } = require('ranvier');
const { InvalidCommandError } = require('../../../lib/CommandParser');

const standardCommands = new Map([
  ['?', { hidden: true, command: 'combat_menu', }], 
  ['a', { label: 'Attack', turnOnly: true, command: 'combat_attack', }],
  ['m', { label: 'Move', turnOnly: true, command: 'combat_move', }],
  ['l', { label: 'List', turnOnly: false, command: 'combat_list', }],
  ['s', { label: 'Show Map', turnOnly: false, command: 'combat_showmap', }],
//  ['i', { label: 'Inspect', turnOnly: false, command: 'combat_inspect', }],
  ['f', { label: 'Flee', turnOnly: true, command: 'combat_flee', }],
  ['e', { label: 'End', turnOnly: true, command: 'combat_endturn', }],
]);

module.exports = class CombatMenu {
  constructor(gameState, controller) {
    this.gameState = gameState;
    this.controller = controller;
  }

  parseInput(player, input) {
    input = input.trim();

    if (!input.length) {
      B.prompt(player);
      return;
    }

    let [command, ...args] = input.split(' ');
    args = args.join(' ');

    const availableCommands = this.getAvailableCommands(player);
    if (availableCommands.has(command)) {
      const combatCommand = availableCommands.get(command);
      const gameCommand = this.gameState.CommandManager.get(combatCommand.command);
      if (gameCommand) {
        return gameCommand.execute(args, player);
      }
    }

    throw new InvalidCommandError();
  }

  getAvailableCommands(player) {
    // TODO: allow player class/effects/whatever else to add to this list
    return new Map([...standardCommands.entries()].filter((key, entry) => {
      if (entry.hidden) {
        return false;
      }

      if (entry.turnOnly && !player.combatData.onTurn) {
        return false;
      }

      return true;
    }));
  }

  showTurnStart(player) {
    this.controller.map.draw(player);
    this.showMenu(player);
  }

  showMenu(player) {
    const availableCommands = [...this.getAvailableCommands(player).entries()]
      .filter(([key, entry]) => !entry.hidden)
    ;
    const longestLabel = Math.max(
      ...(availableCommands.map(([key, entry]) => entry.label.length))
    );
    // allow for double the width of the widest label + key legends
    const width = (longestLabel * 2) + 12;
    let menu = ''.padStart(width, '-') + '\r\n';

    let i = 0;
    for (const [key, entry] of availableCommands) {
      if (i % 2 === 0) {
        menu += `| ${key}) ${entry.label}`.padEnd(width / 2);
      } else {
        menu += `${entry.label} (${key} |`.padStart(width / 2) + '\r\n';
      }

      i++;
    }

    menu += ''.padStart(width, '-') + '\r\n';
    let statLine = '| ';
    statLine += `HP: ${player.getAttribute('health')}/${player.getMaxAttribute('health')}`
      .padEnd(Math.floor(width / 2) - 2)
    ;
    statLine += `MP: ${player.getAttribute('movement')}/${player.getMaxAttribute('movement')}`
      .padStart(Math.ceil(width / 2) - 2)
    ;
    menu += statLine + ' |\r\n';
    menu += `| Attacks: ${player.getAttribute('attacks')}/${player.getMaxAttribute('attacks')}`.padEnd(width - 2) + ' |\r\n';
    menu += ''.padStart(width, '-');
    B.sayAt(player, menu);
  }
};
