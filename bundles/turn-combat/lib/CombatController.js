'use strict';

const { Broadcast, Damage } = require('ranvier');
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
 * @broadcastable
 */
module.exports = class CombatController {
  constructor(state) {
    this.gameState = state;
    this.participants = [];
    this.map = null;
    this.round = 1;
    this.ttk = null;
    this.orderIndex = null;
    this.BLUETEAM = Symbol('BLUE');
    this.REDTEAM = Symbol('RED');
    this.OTHERTEAM = Symbol('OTHER');
    this.menu = new CombatMenu(state, this);
    this._teamCount = {
      [this.REDTEAM]: 0,
      [this.BLUETEAM]: 0,
      [this.OTHERTEAM]: 0,
    };
    this._downedCount = {
      [this.REDTEAM]: 0,
      [this.BLUETEAM]: 0,
      [this.OTHERTEAM]: 0,
    };
  }

  /**
   * Get participants sorted by initiative (highest first)
   * @return {Array<CombatParticipant>}
   */
  get order() {
    return this.participants.sort((a, b) => b.initiative - a.initiative);
  }

  /**
   * Get participant for current turn
   * @return {CombatParticipant}
   */
  get currentParticipant() {
    return this.orderIndex !== null ? this.order[this.orderIndex] : null;
  }

  parseInput(player, input) {
    this.menu.parseInput(player, input);
  }

  addParticipant(character, team) {
    character.combatData.controller = this;
    character.combatData.team = team;
    this._teamCount[team]++;
    this.participants.push(new CombatParticipant(
      character,
      team,
      // TODO: need to roll initiative
      character.getAttribute('initiative')
    ))
  }

  changeParticipantTeam(participant, team) {
    this._teamCount[participant.team]--;
    participant.team = team;
    participant.character.combatData.team = team;
    this._teamCount[team]++;
  }

  /**
   * Start a new combat session between given player and target.
   * @param {Player} player
   * @param {Character} target
   */
  beginCombat(player, target) {
    // TODO: get map from current room CombatMap.fromRoom(player.room)
    this.map = CombatMap.fromDefault(this);

    // TODO: blue/red should allow for things like charm effects where a character switches emnity
    // it's also not as simple as PC vs NPC because PCs could have NPC pets or something
    // TODO: These should get blue team from player party, red should get banded NPCs
    const blue = [player];
    const red = [target];

    for (const c of blue) {
      this.addParticipant(c, this.BLUETEAM);
    }

    for (const c of red) {
      this.addParticipant(c, this.REDTEAM);
    }

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


    // TODO: Reward players if they won

    for (const p of this.order) {
      const { condition } = p.character.combatData;

      p.character.combatData = {};

      if (p.character.isNpc) {
        this.gameState.MobManager.removeMob(p.character);
        continue;
      }

      // at the end of combat put downed players at 1 HP
      if (condition === 'downed') {
        p.character.setAttribute('health', 1);
      }

      p.character.emit('combatEnd');
      Broadcast.sayAt(p.character, '-> The battle is over!');
      Broadcast.prompt(p.character);
    }

    this.participants = null;
    this.gameState = null;
  }

  /**
   * Advance to the next combat turn
   */
  nextTurn() {
    if (this.ttk) {
      return;
    }

    let currentP = this.currentParticipant;

    // downed characters don't get a turn
    if (currentP && currentP.character.combatData.condition !== 'downed') {
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
    const currentChar = currentP.character;

    if (currentChar.combatData.condition === 'downed') {
      return this.nextTurn();
    }

    currentChar.combatData.onTurn = true;
    currentChar.emit('combatStartTurn');


    for (const p of this.order) {
      if (p === currentP) {
        Broadcast.sayAt(p.character, "-> It's your turn.");
        continue;
      }

      Broadcast.sayAt(p.character, `-> ${currentChar.name} starts their turn.`);
    }


    if (currentChar.isNpc) {
      const ai = currentChar.getMeta('combatAI') ? require('../../../' + currentChar.getMeta('combatAI')) : require('./ai/Idiot');
      ai.doTurn(this, currentChar);
      currentChar.setAttributeToMax('movement');
      currentChar.setAttributeToMax('attacks');
      return this.nextTurn();
    }
  }

  /**
   * Any damage dealt should go through this method so there is a central
   * place to check to see if damage should down a character. Otherwise it's
   * spread between different behaviors/events and it gets messy
   * @param {Damage} damage
   * @param {Character} target
   */
  doDamage(damage, target) {
    damage.commit(target);

    if (target.getAttribute('health') <= 0) {
      Broadcast.sayAt(this, `-> ${target.name} falls unconscious!`);
      target.combatData.condition = 'downed';
      target.emit('downed');

      const { team } = target.combatData;

      this._downedCount[team]++;
      if (this._downedCount[team] >= this._teamCount[team]) {
        this.ttk = team;
        this.endCombat();
      }
    }
  }

  /**
   * Any healing done should go through this method so there is a central
   * place to bring a character back from downed condition. Otherwise it's
   * spread between different behaviors/events and it gets messy.
   *
   * If brought back from downed the character will be prone
   *
   * @param {Heal} heal
   * @param {Character} target
   */
  doHealing(heal, target) {
    heal.commit(target);
    if (target.getAttribute('health') > 0) {
      Broadcast.sayAt(this, `-> ${target.name} is now conscious!`);
      target.combatData.condition = 'prone';
      this._downedCount[target.combatData.team]--;
    }
  }

  /**
   * Can use the controller as a broadcast target to send a message to all participants
   * @return {Array<Character>}
   */
  getBroadcastTargets() {
    return this.participants.map(p => p.character);
  }
};
