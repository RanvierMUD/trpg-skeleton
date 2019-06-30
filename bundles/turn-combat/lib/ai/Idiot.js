'use strict';

const { Broadcast: B, Damage } = require('ranvier');

/**
 * Idiot AI that always moves towards the nearest enemy then attacks every
 * turn once it's reached one.
 * It will not:
 *  * run if outnumbered/weak
 *  * attack from range
 *  * find cover from ranged attacks
 *  * heal allies
 *  * attempt to revive allies
 */
module.exports = class Idiot {
  static doTurn(controller, npc) {
    const { condition } = npc.combatData;
    const map = controller.map;
    const move = npc.getAttribute('movement');
    const maxMove = npc.getMaxAttribute('movement');

    let adjacentEnemy = map.getFirstAdjacentEnemy(npc);

    switch (condition) {
      case 'prone': {
        // can only stand up if it has full movement
        if (move === maxMove) {
          const cost = new Damage('movement', move, npc);
          cost.commit(npc);
          B.sayAt(controller, `-> ${npc.name} stands up.`);
        }

        if (!adjacentEnemy) {
          return;
        }
      }
    }

    if (adjacentEnemy) {
      B.sayAt(controller, `-> ${npc.name} attacks ${adjacentEnemy.name}!`);
      // TODO: this should use an attack roller instead of just doing one damage
      controller.doDamage(new Damage('health', 1), adjacentEnemy);
      return;
    }

    const nearestPath = map.findPathToNearestEnemy(npc);
    if (!nearestPath) {
      console.log(`The idiot couldn't find an enemy to move to.`);
      return;
    }

    const { enemy, path } = nearestPath;

    const distance = Math.min(move - 1, path.length - 1);

    // get the farther cell the npc can move to
    const endCoords = path[distance];
    const endCell = map.getRoom(...endCoords);

    B.sayAt(controller, `-> ${npc.name} moves towards ${enemy.name}.`);
    endCell.setOccupant(npc);
    const cost = new Damage('movement', distance, npc);
    cost.commit(npc);

    // if they didn't make it all the way to the nearest enemy end the turn
    if (endCoords !== path[path.length - 1]) {
      return;
    }

    const attacks = npc.getAttribute('attacks');
    for (let i = 0; i < attacks; i++) {
      B.sayAt(controller, `-> ${npc.name} attacks ${enemy.name}!`);
      // TODO: this should use an attack roller instead of just doing one damage
      controller.doDamage(new Damage('health', 1), enemy);
    }
    const attackUsage = new Damage('attacks', attacks, npc);
    attackUsage.commit(npc);
  }
};
