'use strict';

const { Broadcast: B, Damage } = require('ranvier');

module.exports = {
  command: state => (args, player) => {
    const { onTurn, cell, controller } = player.combatData;

    if (!onTurn) {
      return B.sayAt(player, "It's not your turn.");
    }

    const movement = player.getAttribute('movement');

    // targeting a cell
    if (/^to [A-Z1-9@]$/i.test(args)) {
      const sigil = args.split(' ').pop().toUpperCase();

      if (sigil === '@') {
        return B.sayAt("You shimmy in place. That was fun.");
      }

      const cell = controller.map.getCellFromSigil(sigil, player);
      if (!cell) {
        return B.sayAt(player, '! Invalid target');
      }

      const currentCell = player.combatData.cell;
      const totalDistance = controller.map.getDistance(cell, currentCell) - 1;

      if (totalDistance > movement) {
        return B.sayAt(player, "That's too far away.");
      }

      return B.sayAt(player, `Targeting cell [${cell.coordinates}] with occupant ${cell.occupant.name}`);
    }

    const change = [0, 0];
    let totalDistance = 0;
    for (const mv of args.split(' ')) {
      let dir = null;
      let length = null;
      if (/^[nesw]\d*$/.test(mv)) {
        [dir, length] = mv.split('');
      } else {
        [length, dir] = mv.split('');
      }
      length = parseInt(length, 10);
      length = isNaN(length) ? 1 : length;
      switch (dir) {
        case 'n':
          change[1] += length;
          break;
        case 's':
          change[1] -= length;
          break;
        case 'e':
          change[0] += length;
          break;
        case 'w':
          change[0] -= length;
          break;
        default:
          continue;
      }

      totalDistance += length;
    }

    if (totalDistance === 0) {
      return B.sayAt(player, "Move where? (Use `m to A` to target A, for example)");
    }

    if (totalDistance > movement) {
      return B.sayAt(player, "That's too far away.");
    }

    const currentCoords = cell.coordinates;
    const newX = currentCoords[0] + change[0];
    const newY = currentCoords[1] + change[1];
    const nextCell = controller.map.getRoom(newX, newY);

    if (nextCell.occupant) {
      B.sayAt(player, 'Cell is already occupied.');
    } else {
      nextCell.setOccupant(player);
      const moveDamage = new Damage('movement', totalDistance, player);
      moveDamage.commit(player);

      controller.menu.showTurnStart(player);
    }
  },
  metadata: {
    combatOnly: true,
  },
};
