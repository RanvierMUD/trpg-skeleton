'use strict';

const Abilities = require('./lib/Abilities');

module.exports = [
  { name: 'agility', base: 10 },
  { name: 'movement', base: 3 },
  { name: 'attacks', base: 1 },
  {
    name: 'initiative',
    base: 0,
    formula: {
      requires: ['agility'],
      fn: function (character, initiative, agility) {
        return initiative + Abilities.getBonus(agility);
      },
    },
  },
];


