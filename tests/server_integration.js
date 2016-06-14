"use strict";

let testing = require('testing');
let WebSocket = require('ws');

let RelayServer = require('../index');

let tests = [
  test_WSConnect,
  test_oneClientAuthentication,
  test_relay,
  test_incorrectToken,
  test_authorizeAllChannels,
  test_invalidJSON
];

module.exports = tests;

function test_WSConnect(port, callback) {
  let server = new RelayServer({ port }, () => {
    let ws = new WebSocket('ws://localhost:' + port);

    ws.on('open', () => {
      server.close(testing.success.bind(null, callback));
    });
  });
}

function test_oneClientAuthentication(port, callback) {
  let server = new RelayServer({ port }, () => {
    let client = server.registerClient();
    let ws = new WebSocket('ws://localhost:' + port);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        authentication: {
          clientId: client.id,
          token: client.token
        }
      }), undefined, () => {
        server.close(testing.success.bind(null, callback));
      });
    });
  });
}

function test_relay(port, callback) {
  let server = new RelayServer({ port: port }, () => {
    let client1 = server.registerClient();
    let client2 = server.registerClient();
    server.registerRelayChannel(client1.id, client2.id);

    let ws1 = new WebSocket('ws://localhost:' + port);
    let ws2 = new WebSocket('ws://localhost:' + port);

    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        authentication: {
          clientId: client1.id,
          token: client1.token
        }
      }));
      ws1.send(JSON.stringify({
        relay: {
          message: 'from client 1',
          targetId: client2.id
        }
      }));
    });

    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        authentication: {
          clientId: client2.id,
          token: client2.token
        }
      }));

      ws2.send(JSON.stringify({
        relay: {
          message: 'from client 2',
          targetId: client1.id
        }
      }));
    });

    let relay1P = new Promise((resolve, reject) => {
      ws1.once('message', (message) => {
        message = JSON.parse(message);
        if (message.relay) {
          testing.assertEquals(message.relay.message, 'from client 2');
          resolve();
        }
      });
    });

    let relay2P = new Promise((resolve, reject) => {
      ws2.once('message', (message) => {
        message = JSON.parse(message);
        if (message.relay) {
          testing.assertEquals(message.relay.message, 'from client 1');
          resolve();
        }
      });
    });

    Promise.all([relay1P, relay2P])
      .then(() => {
        server.close(testing.success.bind(null, callback));
      });
  });
}

function test_incorrectToken(port, callback) {
  let server = new RelayServer({port: port}, () => {
    let client = server.registerClient();
    let ws = new WebSocket('ws://localhost:' + port);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        authentication: {
          clientId: client.id,
          token: 'incorrect token'
        }
      }));
    });
  });

  server.on('error', (error) => {
    testing.assertEquals(error, 'incorrect token');
    server.close(testing.success.bind(null, callback));
  });
}

function test_authorizeAllChannels(port, callback) {
  let server = new RelayServer({
    port: port,
    authorizeAllChannels: true
  }, () => {
    let client1 = server.registerClient();
    let client2 = server.registerClient();

    let ws1 = new WebSocket('ws://localhost:' + port);
    let ws2 = new WebSocket('ws://localhost:' + port);

    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        authentication: {
          clientId: client1.id,
          token: client1.token
        }
      }));
      ws1.send(JSON.stringify({
        relay: {
          message: 'from client 1',
          targetId: client2.id
        }
      }));
    });

    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        authentication: {
          clientId: client2.id,
          token: client2.token
        }
      }));

      ws2.send(JSON.stringify({
        relay: {
          message: 'from client 2',
          targetId: client1.id
        }
      }));
    });

    let relay1P = new Promise((resolve, reject) => {
      ws1.once('message', (message) => {
        message = JSON.parse(message);
        if (message.relay) {
          testing.assertEquals(message.relay.message, 'from client 2');
          resolve();
        }
      });
    });

    let relay2P = new Promise((resolve, reject) => {
      ws2.once('message', (message) => {
        message = JSON.parse(message);
        if (message.relay) {
          testing.assertEquals(message.relay.message, 'from client 1');
          resolve();
        }
      });
    });

    Promise.all([relay1P, relay2P])
      .then(() => {
        server.close(testing.success.bind(null, callback));
      });
  });
}

function test_invalidJSON(port, callback) {
  let server = new RelayServer({port: port}, () => {
    let ws = new WebSocket('ws://localhost:' + port);
    ws.on('open', () => {
      ws.send('{{}');
    });
  });

  server.on('error', (error) => {
    testing.assertEquals(error, 'invalid JSON');
    server.close(testing.success.bind(null, callback));
  });
}

