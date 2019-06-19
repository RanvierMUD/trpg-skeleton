"use strict";

const passwordAttempts = {};
const maxFailedAttempts = 3;

module.exports = {
  event: state => (socket, args) => {
    const name = args.account.name;

    if (!passwordAttempts[name]) {
      passwordAttempts[name] = 0;
    }

    // Boot and log any failed password attempts
    if (passwordAttempts[name] >= maxFailedAttempts) {
      socket.write("Password attempts exceeded.\r\n");
      passwordAttempts[name] = 0;
      socket.end();
      return false;
    }

    socket.write("Enter your password: ");
    socket.command("toggleEcho");

    socket.once("data", pass => {
      socket.command("toggleEcho");

      pass = pass.toString().trim();

      if (!args.account.checkPassword(pass)) {
        socket.write("Incorrect password.\r\n");
        passwordAttempts[name]++;

        return socket.emit("password", socket, args);
      }

      passwordAttempts[name] = 0;

      if (!args.account.characters.length) {
        return socket.emit("create-character", socket, args);
      }

      socket.write("\r\nWelcome back!\r\n");
      socket.emit("account-menu", socket, args);
    });
  }
};
