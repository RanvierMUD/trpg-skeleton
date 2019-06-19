"use strict";

const { Broadcast, Config, Logger } = require("ranvier");

module.exports = {
  event: state => (socket, args) => {
    let account = args.account;

    const pm = state.PlayerManager;

    socket.write("Choose your character:\r\n");
    // This just gets their names.
    const characters = account.characters.filter(currChar => currChar.deleted === false);
    const maxCharacters   = Config.get("maxCharacters");
    const canAddCharacter = characters.length < maxCharacters;

    let options = [];

    // Configure account options menu
    options.push({
      display: "Change Password",
      onSelect: () => {
        socket.emit("change-password", socket, { account, nextStage: "account-menu" });
      },
    });

    if (canAddCharacter) {
      options.push({
        display: "Create New Character",
        onSelect: () => {
          socket.emit("create-character", socket, { account });
        },
      });
    }

    if (characters.length) {
      options.push({ display: "Login As:" });
      characters.forEach(char => {
        options.push({
          display: char.username,
          onSelect: async () => {
            let currentPlayer = pm.getPlayer(char.username);
            let existed = false;
            if (currentPlayer) {
              // kill old connection
              Broadcast.at(currentPlayer, "Connection taken over by another client. Goodbye.");
              currentPlayer.socket.end();

              // link new socket
              currentPlayer.socket = socket;
              Broadcast.at(currentPlayer, "Taking over old connection. Welcome.");
              Broadcast.prompt(currentPlayer);

              currentPlayer.socket.emit("commands", currentPlayer);
              return;
            }

            currentPlayer = await state.PlayerManager.loadPlayer(state, account, char.username);
            currentPlayer.socket = socket;
            socket.emit("done", socket, { player: currentPlayer });
          },
        });
      });
    }

    options.push({ display: "" });

    options.push({
      display: "Quit",
      onSelect: () => socket.end(),
    });

    // Display options menu

    let optionI = 0;
    options.forEach((opt) => {
      if (opt.onSelect) {
        optionI++;
        socket.write(`| [${optionI}] ${opt.display}\r\n`);
      } else {
        socket.write(`| ${opt.display}\r\n`);
      }
    });

    socket.write("|\r\n`-> ");

    socket.once("data", choice => {
      choice = choice.toString().trim();
      choice = parseInt(choice, 10) - 1;
      if (isNaN(choice)) {
        return socket.emit("account-menu", socket, args);
      }

      const selection = options.filter(o => !!o.onSelect)[choice];

      if (selection) {
        Logger.log("Selected " + selection.display);
        return selection.onSelect();
      }

      return socket.emit("account-menu", socket, args);
    });
  }
};
