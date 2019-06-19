'use strict';

module.exports = class Abilities {
  static getBonus(value) {
    return Math.floor((value - 10) / 2);
  }
};
