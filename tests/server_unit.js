"use strict";

let testing = require('testing');

let RelayServer = require('../index');

let unitTests = [
  test_createRelayServer,
  test_registerClient,
  test_registerRelayConnection,
  test_registerRelayConnectionNeitherExisting,
  test_registerRelayConnectionOneExisting
];

module.exports = unitTests;

function test_createRelayServer(port, callback) {
  let server = new RelayServer({ port }, function() {
    // close server and when done call success
    server.close(testing.success.bind(null, callback));
  });
}

function test_registerClient(port, callback) {
  let server = new RelayServer({ port }, () => {
    let { token, id } = server.registerClient();
    testing.assert(token !== undefined && token !== null);
    testing.assert(id !== undefined && id !== null);
    server.close(testing.success.bind(null, callback));
  });
}

function test_registerRelayConnection(port, callback) {
  let server = new RelayServer({ port }, () => {
    let { token: client1Token, id: client1Id }  = server.registerClient();
    let { key: client2Token, id: client2Id }  = server.registerClient();
    server.registerRelayChannel(client1Id, client2Id);
    server.close(testing.success.bind(null, callback));
  });
}

function test_registerRelayConnectionNeitherExisting(port, callback) {
  let server = new RelayServer({ port }, () => {
    let didExceptionOccur = exceptionOccurred('ClientNotFoundException', () => {
      server.registerRelayChannel('id that does not exist', 'second id that does not exist');
    });
    testing.assert(didExceptionOccur);
    server.close(testing.success.bind(null, callback));
  });
}

function test_registerRelayConnectionOneExisting(port, callback) {
  let server = new RelayServer({ port }, () => {
    let { id: client1Id }  = server.registerClient();
    let exceptionOccurredFirstExisting = exceptionOccurred('ClientNotFoundException', () => {
      server.registerRelayChannel(client1Id, 'second id that does not exist');
    });
    let exceptionOccurredSecondExisting = exceptionOccurred('ClientNotFoundException', () => {
      server.registerRelayChannel('second id that does not exist', client1Id);
    });
    testing.assert(exceptionOccurredFirstExisting);
    testing.assert(exceptionOccurredSecondExisting);
    server.close(testing.success.bind(null, callback));
  });
}


function exceptionOccurred(exceptionName, procedure) {
  try {
    procedure();
    return false;
  }
  catch (ex) {
    if (ex.name === exceptionName) {
      return true;
    }
    else {
      throw ex;
    }
  }
}
