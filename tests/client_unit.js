"use strict";

let testing = require('testing');
let rewire = require('rewire');

let unitTests = [
  test_validateParametersMissing,
  test_validateParametersMissingProperty,
  test_RelayChannelOnMessageCallbacks
];

module.exports = unitTests;

let server = rewire("../src/WebSocketRelay");

let validateParameters = server.__get__("validateParameters");
let RelayChannel = server.__get__("RelayChannel");


function test_validateParametersMissing(callback) {
  try {
    validateParameters();
    testing.failure(callback);
  }
  catch (ex) {
    if (ex.message === 'first parameter is required') {
      testing.success(callback);
    }
    else {
      testing.failure(callback);
    }
  }
}

function test_validateParametersMissingProperty(callback) {
  try {
    validateParameters('ws://example.com', { clientId: 4 });
    testing.failure(callback);
  }
  catch (ex) {
    if (ex.message === 'token property is required in authentication object') {
      testing.success(callback);
    }
    else {
      testing.failure(callback);
    }
  }
}

function test_RelayChannelOnMessageCallbacks(callback) {
  let onMessageCallbacks = [];
  let channel1 = new RelayChannel(null, {}, 1, onMessageCallbacks);
  let channel2 = new RelayChannel(null, {}, 2, onMessageCallbacks);

  channel1.on('message', (message) => {
    testing.assertEquals(message, 'test from client 1')
  });

  channel2.on('message', (message) => {
    testing.assertEquals(message, 'test from client 2')
  });

  onMessageCallbacks.forEach((onMessageCallback) => {
    onMessageCallback({ senderId: 2, message: 'test from client 2'});
  });

  onMessageCallbacks.forEach((onMessageCallback) => {
    onMessageCallback({ senderId: 1, message: 'test from client 1'});
  });
  testing.success(callback);
}