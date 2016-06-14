"use strict";

let testing = require('testing');
let express = require('express');
const ws = require('ws');

let RelayServer = require('../index');
let WebSocketRelay = require('../src');

let tests = [
  test_sendBetweenNoRelayQueue,
  test_sendRelayQueueSocketNotConnected,
  test_sendRelayQueueSocketConnected
];

module.exports = tests;

function test_sendBetweenNoRelayQueue(port, callback) {
  let relayServer = new RelayServer({ port }, () => {
    let client1 = relayServer.registerClient();
    let client2 = relayServer.registerClient();
    relayServer.registerRelayChannel(client1.id, client2.id);

    let client1P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('localhost:' + port, {
        clientId: client1.id,
        token: client1.token
      });
      let channel = relay.createChannel(client2.id);
      relay.on('open', () => resolve(channel));
    });

    let client2P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('localhost:' + port, {
        clientId: client2.id,
        token: client2.token
      });
      let channel = relay.createChannel(client1.id);
      relay.on('open', () => resolve(channel));
    });

    Promise.all([client1P, client2P])
      .then(([channel1, channel2]) => {
        let receivedMessage1P = new Promise((resolve, reject) => {
          channel2.on('message', (message) => {
            testing.assertEquals(message, 'from client 1');
            resolve();
          });
        });

        let receivedMessage2P = new Promise((resolve, reject) => {
          channel1.on('message', (message) => {
            testing.assertEquals(message, 'from client 2');
            resolve();
          });
        });

        channel1.send('from client 1');
        channel2.send('from client 2');

        Promise.all([receivedMessage1P, receivedMessage2P])
          .then(() => {
            relayServer.close(testing.success.bind(null, callback));
          });
      });
  });
}

function test_sendRelayQueueSocketNotConnected(port, callback) {
  let relayServer = new RelayServer({ port }, () => {
    let client1 = relayServer.registerClient();
    let client2 = relayServer.registerClient();
    relayServer.registerRelayChannel(client1.id, client2.id);

    let relay1 = new WebSocketRelay('localhost:' + port, {
      clientId: client1.id,
      token: client1.token
    });
    relay1.on('open', () => {
      let channel1 = relay1.createChannel(client2.id);
      channel1.send('from client 1');

      // must go on the event loop so the ws server requests go through first
      setTimeout(() => {
        let relay2 = new WebSocketRelay('localhost:' + port, {
          clientId: client2.id,
          token: client2.token
        });
        let channel2 = relay2.createChannel(client1.id);
        relay2.on('open', () => {
          channel2.on('message', message => {
            testing.assertEquals(message, 'from client 1');
            relayServer.close(testing.success.bind(null, callback));
          })
        });
      }, 100);
    });
  });
}

function test_sendRelayQueueSocketConnected(port, callback) {
  let relayServer = new RelayServer({ port }, () => {
    let client1 = relayServer.registerClient();
    let client2 = relayServer.registerClient();
    relayServer.registerRelayChannel(client1.id, client2.id);

    let client1P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('localhost:' + port, {
        clientId: client1.id,
        token: client1.token
      });
      let channel = relay.createChannel(client2.id);
      relay.on('open', () => resolve(channel));
    });

    let client2P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('localhost:' + port, {
        clientId: client2.id,
        token: client2.token
      });
      relay.on('open', () => resolve(relay));
    });

    Promise.all([client1P, client2P])
      .then(([channel1, relay2]) => {

        channel1.send('from client 1');

        setTimeout(() => {
          let channel2 = relay2.createChannel(client1.id);
          channel2.on('message', message => {
            testing.assertEquals(message, 'from client 1');
            relayServer.close(testing.success.bind(null, callback));
          });
          channel2.emitQueuedMessages();
        }, 200);
      });
  });
}