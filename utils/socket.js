var io = require('socket.io-client');
var config = require('../config/config');

function noop() {}

function createNoopSocket() {
  return {
    emit: noop,
    on: noop,
    connected: false
  };
}

function createSocket() {
  if (!config.socketURL) {
    return createNoopSocket();
  }

  try {
    return io.connect(config.socketURL, { reconnect: true });
  } catch (err) {
    console.log('Socket connection skipped', err.message);
    return createNoopSocket();
  }
}

module.exports = createSocket;
