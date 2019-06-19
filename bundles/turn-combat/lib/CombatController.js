'use strict';

const { Broadcast } = require('ranvier');
const { CombatMap } = require('./CombatMap');
const CombatMenu = require('./CombatMenu');

class CombatParticipant {
  constructor(character, team, initiative) {
    this.character = character;
    this.team = team;
    this.initiative = initiative;
  }
}

/**
 * Driver for a combat session
 */
module.exports = class CombatController {
  constructor(state) {
    this.gameState = state;
    this.participants = [];
    this.map = null;
    this.round = 1;
    this.orderIndex = null;
    this.BLUETEAM = Symbol('BLUE');
    this.REDTEAM = Symbol('RED');
    this.menu = new CombatMenu(state, this);
  }

  get order() {
    return this.participants.sort((a, b) => b.initiative - a.initiative);
  }

  get currentParticipant() {
    return this.orderIndex !== null ? this.order[this.orderIndex] : null;
  }

  parseInput(player, input) {
    this.menu.parseInput(player, input);
  }

  addParticipant(character, team) {
    character.combatData.controller = this;
    character.combatData.team = team;
    this.participants.push(new CombatParticipant(
      character,
      team,
      character.getAttribute('initiative')
    ))
  }

  beginCombat(player, target) {
    // TODO: get map from current room CombatMap.fromRoom(player.room)
    this.map = CombatMap.fromDefault(this);

    // TODO: blue/red should allow for things like charm effects where a character switches emnity
    // it's also not as simple as PC vs NPC because PCs could have NPC pets or something
    // TODO: These should get blue team from player party, red should get banded NPCs
    const blue = [player];
    const red = [target];


    // TODO: for each player in combat do socket.removeAllListeners('data') to remove them from the command loop

    for (const c of blue) {
      this.addParticipant(c, this.BLUETEAM);
    }

    for (const c of red) {
      this.addParticipant(c, this.REDTEAM);
    }

    // TODO: distribute participants
    this.map.distribute(this.participants);

    for (const { character } of this.participants) {
      Broadcast.sayAt(character, Broadcast.center(80, 'Combat Begins', null, '='));
      Broadcast.sayAt(character);
      character.emit('combatStart');
    }

    this.nextTurn();
  }

  endCombat() {
    const currentP = this.currentParticipant;
    if (currentP.character.combatData.onTurn) {
      currentP.character.combatData.onTurn = false;
      currentP.character.emit('combatEndTurn');
    }

    for (const p of this.order) {

      if (p.character.isNpc) {
        continue;
      }

      p.character.emit('combatEnd');
      p.character.combatData = {};

      Broadcast.sayAt(p.character, '-> The battle is over!');
    }
  }

  nextTurn() {
    let currentP = this.currentParticipant;

    if (currentP) {
      for (const p of this.order) {
        p.character.emit('combatTurnElapsed');

        if (p === currentP) {
          Broadcast.sayAt(p.character, "-> You end your turn.");
          p.character.combatData.onTurn = false;
          p.character.emit('combatEndTurn');
          continue;
        }

        Broadcast.sayAt(p.character, `-> ${currentP.character.name} ends their turn.`);
      }

    }

    if (this.orderIndex + 1 >= this.order.length) {
      this.round++;
      this.orderIndex = 0;
    } else {
      this.orderIndex = this.orderIndex === null ? 0 : this.orderIndex + 1;
    }

    currentP = this.currentParticipant;
    currentP.character.combatData.onTurn = true;
    currentP.character.emit('combatStartTurn');


    for (const p of this.order) {
      if (p === currentP) {
        Broadcast.sayAt(p.character, "-> It's your turn.");
        continue;
      }

      Broadcast.sayAt(p.character, `-> ${currentP.character.name} starts their turn.`);
    }


    if (currentP.character.isNpc) {
      // TODO: for NPC get configured AI from metadata or fallback to BestialAI (always advanced to nearest enemy and attacks)
      this.nextTurn();
      return;
    }
  }
};
