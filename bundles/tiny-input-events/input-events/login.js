'use strict';

const { Logger, Config } = require('ranvier');

module.exports = {
  event: state => (socket, args) => {
    if (!args || !args.dontwelcome) {
      socket.write('Account: ');
    }

    socket.once('data', async name => {
      name = name.toString().trim();

      const invalid = validate(name);
      if (invalid) {
        socket.write(invalid + '\r\n');
        return socket.emit('login', socket);
      }

      name = name[0].toUpperCase() + name.slice(1);

      let account = null;
      try {
        account = await state.AccountManager.loadAccount(name);
      } catch (e) {
        Logger.error(e.message);
      }

      if (!account) {
        return socket.emit('create-account', socket, name);
      }

      return socket.emit('password', socket, { account });
    });
  }
};

function validate(name) {
  const maxLength = Config.get('maxAccountNameLength');
  const minLength = Config.get('minAccountNameLength');

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
}
