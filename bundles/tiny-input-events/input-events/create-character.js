'use strict';

const { Config } = require('ranvier');

/**
 * Player creation event
 */
module.exports = {
  event: state => (socket, args) => {
    socket.write("What would you like to name your character? ");
    socket.once("data", name => {
      socket.write("\r\n");
      name = name.toString("utf8").trim();

      const invalid = validate(name);

      if (invalid) {
        socket.write(invalid + "\r\n");
        return socket.emit('create-player', socket, args);
      }

      name = name[0].toUpperCase() + name.slice(1);

      const exists = state.PlayerManager.exists(name);

      if (exists) {
        say(`That name is already taken.`);
        return socket.emit('create-player', socket, args);
      }

      socket.write(`Are you sure you want to name your character ${name}? [y/n] `);
      socket.once('data', confirmation => {
        socket.write("\r\n");
        confirmation = confirmation.toString("utf8").trim().toLowerCase();

        if (confirmation !== 'y') {
          say(`Let's try again...`);
          return socket.emit('create-player', socket, args);
        }

        args.name = name;
        socket.emit('finish-character', socket, args);
      });
    });
  }
};


function validate(name) {
  const maxLength = Config.get('maxPlayerNameLength');
  const minLength = Config.get('minPlayerNameLength');

  if (!name) {
    return 'Please enter a name.';
  }
  if (name.length > maxLength) {
    return 'Too long, try a shorter name.';
  }
  if (name.length < minLength) {
    return 'Too short, try a longer name.';
  }
  if (!/^[a-z]+$/i.test(name)) {
    return 'Your name may only contain A-Z without spaces or special characters.';
  }
  return false;
};
