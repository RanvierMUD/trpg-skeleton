"use strict";

const { Account } = require("ranvier");

module.exports = {
  event: state => (socket, name) => {
    let newAccount = null;
    socket.write(`Do you want your account"s username to be ${name}? [y/n] `);

    socket.once("data", data => {
      data = data.toString("utf8").trim().toLowerCase();

      if (data === "y" || data === "yes") {
        socket.write("Creating account...\r\n");
        newAccount = new Account({
          username: name
        });

        return socket.emit("change-password", socket, {
          account: newAccount,
          nextStage: "create-character"
        });
      } else if (data && data === "n" || data === "no") {
        socket.write("Let's try again!\r\n");

        return socket.emit("login", socket);
      }

      return socket.emit("create-account", socket, name);
    });
  }
};

