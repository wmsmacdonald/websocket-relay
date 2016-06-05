"use strict";

const relay = require('../');
const express = require('express');

let relayServer = relay.server(4000, () => {

  var app = express();
  app.use(express.static(__dirname + '/public'));

  let server = app.listen(3000, () => {
    console.log('listening');
  });
});

let client1 = relayServer.registerClient();
let client2 = relayServer.registerClient();

relayServer.registerRelayChannel(client1.id, client2.id);
console.log(client1);
console.log(client2);

