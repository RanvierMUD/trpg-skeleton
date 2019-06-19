"use strict";

module.exports = {
  event: state => (socket, args) => {
    socket.write("Your password must be at least 8 characters.\r\n");
    socket.write("Enter your account password: ");

    socket.command("toggleEcho");
    socket.once("data", pass => {
      socket.command("toggleEcho");
      socket.write("\r\n");

      pass = pass.toString("utf8").trim();

      if (!pass) {
        socket.write("You must use a password.\r\n");
        return socket.emit("change-password", socket, args);
      }

      if (pass.length < 8) {
        socket.write("Your password is not long enough.\r\n");
        return socket.emit("change-password", socket, args);
      }

      args.account.setPassword(pass);

      socket.write("Confirm your password: ");
      socket.command("toggleEcho");

      socket.once("data", confirmPass => {
        socket.command('toggleEcho');
        confirmPass = confirmPass.toString("utf8").trim();

        if (!args.account.checkPassword(confirmPass)) {
          socket.write("Passwords do not match.\r\n");
          return socket.emit("change-password", socket, args);
        }

        state.AccountManager.addAccount(args.account);
        args.account.save();

        socket.write("\r\n");
        return socket.emit(args.nextStage, socket, args);
      });
    });
  }
};

