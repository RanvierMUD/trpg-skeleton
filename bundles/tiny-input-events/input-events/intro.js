'use strict';

module.exports = {
  event: state => socket => {
    socket.write("Welcome to the game!\r\n");
    return socket.emit('login', socket);
  },
};
