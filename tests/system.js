"use strict";

let testing = require('testing');
let phantom = require('phantom');
let express = require('express');

let P = {
  spread: (promise, ...args) => {
    return promise
      .then((result) => {
        return Promise.resolve(result, ...args);
      });
  }
};
P.prototype = Object.create(Promise);

let relay = require('../index');

let tests = [
  test1
];

module.exports = tests;

function test1(port1, port2, callback) {
  let pageUrl = 'http://localhost:' + port1 + '/index.html';

  let phInstance;
  let page;
  let staticServer;

  let pageP = phantom.create()
    .then(instance => {
      phInstance = instance;
      return instance.createPage();
    });

  let pageOpenedP = Promise.all([createStaticServer(port1), pageP])
    .then(([SServer, p]) => {
      staticServer = SServer;
      page = p;
      return page.open(pageUrl)
    });

  Promise.all([createRelayServer(port2), pageOpenedP])
    .then(([relayServer, status]) => {
      console.log(relayServer);
    });

}

function spread(promise, ...args) {
  return promise
    .then((result) => {
      return Promise.resolve(result, ...args);
    });
}

function test(port1, port2, callback) {
  let staticServer;
  let phInstance;
  let relayServer;
  let outObj;
  let close = () => {
    page.close();
    phInstance.exit();
    staticServer.close();
  };

  let pageUrl = 'http://localhost:' + port1 + '/index.html';


  let pagesCreatedP = phantom.create()
    .then(instance => {
      phInstance = instance;
      outObj = phInstance.createOutObject();
      outObj.urls = [];
      return Promise.all([
        openPhantomPage(pageUrl, phInstance),
        openPhantomPage(pageUrl, phInstance)
      ]);
    });


  Promise.all([createStaticServer(port1), pagesCreatedP, createRelayServer(port2)])
    .then(values => {
      staticServer = values[0];
      let page1 = values[1][0];
      let page2 = values[1][2];
      relayServer = values[2];

      let client1 = relayServer.registerClient();
      let client2 = relayServer.registerClient();

      relayServer.registerRelayChannel(client1.id, client2.id);

      page1.onConsoleMessage = function(msg) {
        console.log(msg);
      };

      page1.property('onResourceRequested', function(requestData, networkRequest, out) {
        out.urls.push('hello');
      }, outObj);

      outObj.property('urls').then(function(urls){
        console.log(urls);
      });

      return page.evaluate(function(out) {
        out.urls.push('hello');
        /*var relay = new WebSocketRelay('ws://localhost:' + port, {
          clientId: client1.id,
          token: client1.token
        }, function() {
          var channel = relay.createChannel(client2.id);
          channel.send('test from 1');
          window.callPhantom({ hello: 'world' });
          channel.on('message', function() {
            console.log('')
          })
        });*/

        return 'hello';

      }, outObj);



    })
    /*.then((val) => {
      console.log(val);
      console.log(outObj);
      close();

      //testing.success(callback);
    })*/

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


function openPhantomPage(url,phInstance) {
  let page;
  return phInstance.createPage()
    .then((p) => {
      page = p;
      return page.open(url);
    })
    .then(() => {
      return Promise.resolve(page);
    });
}

function createRelayServer(port) {
  let server = relay.server(port);
  return new Promise((resolve, reject) => {
    // HACK: no listening event for relay server so must reach into wss
    server._wss.httpServer.on('listening', resolve.bind(null, server));
  });
}