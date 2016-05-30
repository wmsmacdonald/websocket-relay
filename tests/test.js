"use strict";
let testing = require('testing');
let nodeStatic = require('node-static');
let path = require('path');
let http = require('http');
let phantom = require('phantom');
let binPath = require('phantomjs').path;
let uuid = require('node-uuid');
let ws = require('ws');
let freeport = require('freeport-promise');

let relay = require('../');

let duplicateKeyExceptionOccurred = exceptionOccurred.bind('DuplicateKeyException');

/*freeport((err, port) => {
  if (err) throw err;
  createStaticServer(port);
  phantom.create().then(testTwoBrowsers);
});*/


freeport()
  .then(port => {
    testing.run([
      test_createRelayServer.bind(null, port),
      test_registerClient.bind(null, port),
      test_registerRelayConnection.bind(null, port),
      test_registerRelayConnectionNeitherExisting.bind(null, port),
      test_registerRelayConnectionOneExisting.bind(null, port)
    ], () => {
      console.log('Tests done.');
    });
  });

function test_createRelayServer(port, callback) {
  let server = new relay.Server(port);
  server.close();
  testing.success(callback);
}

function test_registerClient(port, callback) {
  let server = new relay.Server(port);
  let { token, id }  = server.registerClient();
  testing.assert(token !== undefined && token !== null);
  testing.assert(id !== undefined && id !== null);
  server.close();
  testing.success(callback);
}

function test_registerRelayConnection() {
  let server = new relay.Server(port);
  let { token: client1Token, id: client1Id }  = server.registerClient();
  let { key: client2Token, id: client2Id }  = server.registerClient();
  server.registerRelayChannel(client1Id, client2Id);
  server.close();
  testing.success(callback);
}

function test_registerRelayConnectionNeitherExisting(port, callback) {
  let server = new relay.Server(port);
  let exceptionOccurred = exceptionOccurred('ClientNotFoundException', () => {
    server.registerRelayChannel('id that does not exist', 'second id that does not exist');
  });
  testing.assert(exceptionOccurred);
  server.close();
  testing.success(callback);
}

function test_registerRelayConnectionOneExisting(port, callback) {
  let server = new relay.Server(port);
  let { key: client1Key, id: client1Id }  = server.registerClient();
  let exceptionOccurredFirstExisting = exceptionOccurred('ClientNotFoundException', () => {
    server.registerRelayChannel(client1Id, 'second id that does not exist');
  });
  let exceptionOccurredSecondExisting = exceptionOccurred('ClientNotFoundException', () => {
    server.registerRelayChannel('second id that does not exist', client1Id);
  });
  testing.assert(exceptionOccurredFirstExisting);
  testing.assert(exceptionOccurredSecondExisting);
  server.close();
  testing.success(callback);
}

function createStaticServer(port) {
  let fileServer = new nodeStatic.Server(path.join(__dirname, 'public'));

  console.log(port);


  let server = http.createServer(function (request, response) {
    request.addListener('end', function () {
      fileServer.serve(request, response);
    }).resume();
  }).listen(port);


  let url = 'http://localhost:' + port + '/index.html';

  phantom.create()
    .then(ph => {
      return ph.createPage()
    })
    .then(page => {
      return page.open(url)
    })
    .then(success => {

    });


  //server.close()

}

function testTwoBrowsers(ph, url) {
  ph.createPage
    .then(page => {
      return page.open(url);
    })
    .then(success => {

    });

  ph.createPage
    .then(page => {
      return page.open(url);
    })
    .then(success => {

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