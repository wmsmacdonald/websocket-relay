"use strict";

let testing = require('testing');
let phantom = require('phantom');
let express = require('express');
const ws = require('ws');

let RelayServer = require('../index');
let WebSocketRelay = require('../src');

let tests = [
  test
];

module.exports = tests;

function testSendBetweenWithoutQueue(port, callback) {
  let relayServer = new RelayServer(port);

  let client1 = relayServer.registerClient();
  let client2 = relayServer.registerClient();
  relayServer.registerRelayChannel(client1.id, client2.id);

  relayServer.on('listening', () => {
    let client1P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('ws://localhost:' + port, {
        clientId: client1.id,
        token: client1.token
      });
      let channel = relay.createChannel(client2.id);
      relay.on('open', () => resolve(channel));
    });

    let client2P = new Promise((resolve, reject) => {
      let relay = new WebSocketRelay('ws://localhost:' + port, {
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
            relayServer.close();
            testing.success(callback);
          });
      });
  });
}