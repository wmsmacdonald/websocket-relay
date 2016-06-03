"use strict";

let testing = require('testing');
let phantom = require('phantom');
let express = require('express');

let relay = require('../index');

let tests = [
  test
];

module.exports = tests;

function test(port1, port2, callback) {
  let staticServer;
  let phInstance;
  let page;
  let relayServer;
  let close = () => {
    page.close();
    phInstance.exit();
    staticServer.close();
  };

  Promise.all([createStaticServer(port1), openPhantomPage('http://localhost:' + port1 + '/index.html'), createRelayServer(port2)])
    .then(values => {
      staticServer = values[0];
      phInstance = values[1].phInstance;
      page = values[1].page;
      page.onConsoleMessage = function(msg, lineNum, sourceId) {
        console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
      };
      relayServer = values[2];

      let client1 = relayServer.registerClient();
      let client2 = relayServer.registerClient();

      relayServer.registerRelayChannel(client1.id, client2.id);

      page.onCallback = function(data) {
        console.log('CALLBACK: ' + JSON.stringify(data));
      };

      return page.evaluateAsync(function(port, client1, client2) {
        var relay = new WebSocketRelay('ws://localhost:' + port, {
          clientId: client1.id,
          token: client1.token
        }, function() {
          var channel = relay.createChannel(client2.id);
          channel.send('test from 1');
          window.callPhantom({ hello: 'world' });
          channel.on('message', function() {
            console.log('')
          })
        });

      }, port2, client1, client2);


    })
    .then((val) => {
      console.log(val);
      //close();

      //testing.success(callback);
    })

}

function createStaticServer(port) {
  var app = express();
  app.use(express.static(__dirname + '/public'));

  let server = app.listen(port);

  return new Promise((resolve) => {
    server.on('listening', () => {
      resolve(server);
    });
  });
}

function openPhantomPage(url) {
  let phInstance;
  let page;
  return phantom.create()
    .then(instance => {
      phInstance = instance;
      return instance.createPage();
    })
    .then((p) => {
      page = p;
      return page.open(url);
    })
    .then(() => {
      return Promise.resolve({ phInstance: phInstance, page: page})
    });
}

function createRelayServer(port) {
  let server = relay.server(port);
  return new Promise((resolve, reject) => {
    // HACK: no listening event for relay server so must reach into wss
    server._wss.httpServer.on('listening', resolve.bind(null, server));
  });
}