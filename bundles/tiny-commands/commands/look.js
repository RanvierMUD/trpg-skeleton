'use strict';
const { Broadcast: B, Item, Logger, Player } = require('ranvier');

module.exports = {
  command: state => function (args, player) {
    if (!player.room) {
      Logger.error(player.getName() + ' is in limbo.');
      return B.sayAt(player, 'You are in a deep, dark void.');
    }

    const { room } = player;

    B.sayAt(player, room.title);
    B.sayAt(player, B.line(60));
    B.sayAt(player, room.description, 80);

    for (const otherPlayer of room.players) {
      if (otherPlayer === player) {
        continue;
      }

      B.sayAt(player, `[Player] ${otherPlayer.name}`);
    }

    for (const npc of room.npcs) {
      B.sayAt(player, `[NPC] ${npc.name}`);
    }

    for (const item of room.items) {
      B.sayAt(player, `[Item] ${item.roomDesc}`);
    }

    const exits = room.getExits();
    const foundExits = [];

    // prioritize explicit over inferred exits with the same name
    for (const exit of exits) {
      if (foundExits.find(fe => fe.direction === exit.direction)) {
        continue;
      }

      foundExits.push(exit);
    }

    B.at(player, '[Exits: ');
    B.at(player, foundExits.map(exit => {
      const exitRoom = state.RoomManager.getRoom(exit.roomId);
      const door = room.getDoor(exitRoom) || exitRoom.getDoor(room);
      if (door && (door.locked || door.closed)) {
        return '(' + exit.direction + ')';
      }

      return exit.direction;
    }).join(' '));

    if (!foundExits.length) {
      B.at(player, 'none');
    }
    B.sayAt(player, ']');

  },
};
