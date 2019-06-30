'use strict';

const { Broadcast: B, Damage } = require('ranvier');

module.exports = {
  command: state => (args, player) => {
    const { onTurn, cell, controller } = player.combatData;

    if (!onTurn) {
      return B.sayAt(player, "! It's not your turn.");
    }

    const attacks = player.getAttribute('attacks');

    if (attacks <= 0) {
      return B.sayAt(player, "! You don't have any attacks left on this turn");
    }

    let target = null;

    // didn't specify a target, just pick the first adjacent target
    if (!args.length) {
      const adjacent = controller.map.getFirstAdjacentEnemy(player);

      if (!adjacent) {
        return B.sayAt(player, "! You have no adjacent enemies.");
      }

      B.sayAt(player, `? No target specified, choosing adjacent target: ${adjacent.name}.`);
      B.sayAt(controller, `${player.name} moves to attack ${adjacent.name}`);

      target = adjacent;
    } else if (/^[A-Z1-9@]$/i.test(args)) {
      // they targeted a cell, try to move towards that character
      const sigil = args.split(' ').pop().toUpperCase();

      if (sigil === '@') {
        return B.sayAt("! You try to smack some sense into yourself");
      }

      const cell = controller.map.getCellFromSigil(sigil, player);
      if (!cell) {
        return B.sayAt(player, '! Invalid target');
      }

      if (cell.occupant.combatData.team === player.combatData.team) {
        return B.sayAt(player, "! Can't attack your teammate");
      }

      const currentCell = player.combatData.cell;
      let path = controller.map.findPath(currentCell, cell);
      if (!path) {
        return B.sayAt(player, `! Can't find a path to ${cell.occupant.name}`);
      }

      target = cell.occupant;

      // remove last cell in path since that's the actual target enemy
      path.splice(path.length - 1);

      const movement = player.getAttribute('movement');

      if (path.length > movement) {
        return B.sayAt(player, "! They are too far away");
      }

      if (path.length) {
        const endCoords = path[path.length - 1];
        const endCell = controller.map.getRoom(...endCoords);
        const totalDistance = Math.min(path.length, movement);

        endCell.setOccupant(player);
        const moveDamage = new Damage('movement', totalDistance, player);
        moveDamage.commit(player);

        B.sayAt(controller, `-> ${player.name} moves towards ${target.name}.`);
      }
    } else {
      return B.sayAt(player, '! Not a valid target. Choose a target from the map or no target to automatically attack an adjacent enemy.');
    }

    if (!target) {
      return B.sayAt(player, "! You don't have a target");
    }

    const attackUsage = new Damage('attacks', 1, player);
    attackUsage.commit(player);
    B.sayAt(controller, `-> ${player.name} attacks ${target.name}!`);
    // TODO: this should use an attack roller instead of just doing one damage
    controller.doDamage(new Damage('health', 1, player), target);
  },
  metadata: {
    combatOnly: true,
  },
};
