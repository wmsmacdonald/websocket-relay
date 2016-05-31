"use strict";
let testing = require('testing');
let nodeStatic = require('node-static');
let path = require('path');
let http = require('http');
let phantom = require('phantom');
let binPath = require('phantomjs').path;
//let WebSocketServer = require('ws').Server;
let freeport = require('freeport-promise');
let assert = require('assert');
let enableDestroy = require('server-destroy');


let relay = require('../');

/*freeport((err, port) => {
  if (err) throw err;
  createStaticServer(port);
  phantom.create().then(testTwoBrowsers);
});*/

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


let tests = [
  test_createRelayServer,
  test_registerClient,
  test_registerRelayConnection,
  test_registerRelayConnectionNeitherExisting,
  test_registerRelayConnectionOneExisting
];

freeport()
  .then(port => {
    let testsWithPort = tests.map(test => {
      return test.bind(null, port);
    });
    testing.run(testsWithPort);
  });

function test_createRelayServer(port, callback) {
  let server = relay.server(port, () => {
    server.close();
    testing.success(callback);
  });
}

function test_registerClient(port, callback) {
  let server = relay.server(port, () => {
    let { token, id }  = server.registerClient();
    testing.assert(token !== undefined && token !== null);
    testing.assert(id !== undefined && id !== null);
    server.close();
    testing.success(callback);
  });
}

function test_registerRelayConnection(port, callback) {
  let server = relay.server(port, () => {
    let { token: client1Token, id: client1Id }  = server.registerClient();
    let { key: client2Token, id: client2Id }  = server.registerClient();
    server.registerRelayChannel(client1Id, client2Id);
    server.close();
    testing.success(callback);
  });
}

function test_registerRelayConnectionNeitherExisting(port, callback) {
  let server = relay.server(port, () => {
    let didExceptionOccur = exceptionOccurred('ClientNotFoundException', () => {
      server.registerRelayChannel('id that does not exist', 'second id that does not exist');
    });
    testing.assert(didExceptionOccur);
    server.close();
    testing.success(callback);
  });
}

function test_registerRelayConnectionOneExisting(port, callback) {
  let server = relay.server(port, () => {
    let { key: _, id: client1Id }  = server.registerClient();
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
  });
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



