'use strict';

const { AreaFloor, Broadcast: B } = require('ranvier');

class CombatMap extends AreaFloor {
  constructor(controller) {
    super(0);
    this.controller = controller;
    this.startingLocs = null;
  }

  static fromDefault(controller) {
    const map = new this(controller);
    const size = 10;

    for (let i = 0; i < size * size; i++) {
      const y = Math.floor(i / size);
      const x = i % size;
      map.addRoom(x, y, CombatCell.fromSigil([x, y], '.'));
    }

    return map;
  }

  addRoom(x, y, cell) {
    super.addRoom(x, y, cell);
    cell.floor = this;
  }

  distribute(participants) {
    const takenSpots = [];

    const range = (min, max) => Math.floor(Math.random() * (max - min)) + min;

    // default distribute red team to top, blue team to bottom
    if (!this.startingLocs) {
      for (const p of participants) {
        // blue team goes in the bottom half, red team goes in the top half
        const yTop = p.team === this.controller.BLUETEAM ? Math.floor(this.highY / 2) - 1 : this.highY - 1;
        const yBottom = p.team === this.controller.BLUETEAM ? 0 : Math.ceil(this.highY / 2) + 1;

        // keep trying to find an open spot
        let tries = 0;
        let takenKey = null;
        let x = null;
        let y = null;
        do {
          x = range(0, this.highX);
          y = range(yBottom, yTop);
          takenKey = `${x}:${y}`;
          if (++tries > 5) {
            throw new Error('Could not determine starting spot in map, erroring');
            // TODO: warning/do something if we seem to be having a had time positioning
          }
        } while (takenSpots.includes(takenKey));

        takenSpots.push(takenKey);
        const cell = this.getRoom(x, y);
        cell.setOccupant(p.character);
      }

      return;
    }

    // TODO: if the map has starting locations distribute there
    return;
  }

  draw(player) {
    const map = this.controller.map;
    const line = ''.padStart((map.highX + 1) * 2 + 3, '-') + '\r\n';
    let render = line;
    for (let y = map.highY; y >= 0; y--) {
      render += '| ';
      for (let x = 0; x <= map.highX; x++) {
        const cell = map.getRoom(x, y);
        const sigil = cell.occupant ? this.getOccupantSigil(player, cell.occupant) : cell.sigil;
        render += sigil + ' ';
      }

      render += '|\r\n';
    }

    render += line;

    B.sayAt(player, render.trim());
  }

  getCellFromSigil(sigil, player) {
    if (sigil === '@') {
      return player.combatData.cell;
    }

    const isEnemy = /[a-z]/i.test(sigil);
    const targetIndex = isEnemy ? sigil.charCodeAt(0) - 65 : sigil.charCodeAt(0) - 8;
    let enemyIndex = 0;
    let allyIndex = 0;
    for (let i = 0; i < this.controller.order.length; i++) {
      const c = this.controller.order[i].character;

      if (c.combatData.team !== player.combatData.team) {
        if (isEnemy && enemyIndex === targetIndex) {
          return c.combatData.cell;
        }
        enemyIndex++;
      } else {
        if (!isEnemy && allyIndex === targetIndex) {
          return c.combatData.cell;
        }
        allyIndex++;
      }
    }

    return null;
  }

  getOccupantSigil(player, occupant) {
    if (occupant === player) {
      return '@';
    }

    let enemyIndex = 0;
    let allyIndex = 0;
    for (let i = 0; i < this.controller.order.length; i++) {
      const c = this.controller.order[i].character;
      if (c === occupant) {
        break;
      }

      if (c.combatData.team !== player.combatData.team) {
        enemyIndex++;
      } else {
        allyIndex++;
      }
    }

    if (occupant.combatData.team !== player.combatData.team) {
      // A-Z
      return String.fromCharCode(65 + enemyIndex);
    }

    // 0-9
    return String.fromCharCode(48 + allyIndex);
  }

  static getDistance(cellA, cellB) {
    return Math.abs(cellA.coordinates[0] - cellB.coordinates[0]) + Math.abs(cellA.coordinates[1] - cellB.coordinates[1]) - 1;
  }
};

const TYPE_FREE = Symbol('FREE');
const TYPE_ROUGH = Symbol('ROUGH');
const TYPE_VOID = Symbol('VOID');
const TYPE_WALL = Symbol('WALL');
const TYPE_WATER = Symbol('WATER');

const sigilMap = {
  '.': TYPE_FREE,
  '|': TYPE_WALL,
  '-': TYPE_WALL,
  '~': TYPE_WATER,
  ' ': TYPE_VOID,
  '#': TYPE_ROUGH,
};

class CombatCell {
  constructor(coordinates, sigil, type) {
    this.coordinates = coordinates;
    this.sigil = sigil;
    this.type = type;
    this.occupant = null;
    this.floor = null;
  }

  static fromSigil(coordinates, sigil) {
    return new this(coordinates, sigil, this.getTypeForSigil(sigil));
  }

  static getTypeForSigil(sigil) {
    return sigilMap[sigil];
  }

  static get TYPE_FREE() { return TYPE_FREE; }
  static get TYPE_ROUGH() { return TYPE_ROUGH; }
  static get TYPE_VOID() { return TYPE_VOID; }
  static get TYPE_WALL() { return TYPE_WALL; }
  static get TYPE_WATER() { return TYPE_WATER; }

  setOccupant(char) {
    if (char.combatData.cell) {
      // can't be in two places at once
      char.combatData.cell.occupant = null;
    }

    this.occupant = char;
    char.combatData.cell = this;
  }
}

module.exports = {
  CombatMap,
  CombatCell,
};
