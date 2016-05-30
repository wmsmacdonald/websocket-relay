"use strict";
let hat = require('hat');
let WebSocketServer = require('ws').Server;

let messageSchemas = require('./message_schemas');
let simpleClientMatch = require('./simple_client_match');

function server(options) {

  let clients = [];


  let wss = new WebSocketServer({
    port: options.port
  });

  wss.on('connection', ws => {


    ws.on('message', function(message) {
      // if valid json
      if (isValidJSON(message)) {
        message = JSON.parse(message);

        // if message fits authenticate message schema
        if (messageSchemas.authentication.validate(message).length === 0) {
          let client = authenticate(message.authentication.clientId, message.authentication.clientId);
          if (client) {
            client.onAuthenticated(ws);
          }
          else {
            close();
          }
        }

        else if (messageSchemas.call.validate(message).length === 0) {
          let answerer = typeof options.matchClient == "function"
            ? options.matchClient(caller, clients)
            : simpleClientMatch(caller, clients);

          if (answerer) {
            caller.channels[answerer.id] = {
              remoteClient: answerer
            };
            answerer.channels[caller.id] = {
              remoteClient: caller
            };

            // laneId identifies the relay lane on the client side
            caller.channels[answerer.id].localLaneId = message.call.laneId;
            answerer.channels[caller.id].remoteLaneId = message.call.laneId;

            call(caller, answerer)
            // got answer
              .then(laneId => {
                caller.channels[answerer.id].remoteLaneId = laneId;
                answerer.channels[caller.id].localLaneId = laneId;
                answer(answerer, caller, message.callbackNum);
              });
          }
        }
      }

    });

    if (messageSchemas.relay.validate(message).length === 0) {
      // if client has a relay connection to the target
      if (client.channels.hasOwnProperty(String(message.relay.remoteClientId))) {

        relay(client.channels[message.relay.remoteClientId], message.relay.message);
      }
      else {
        console.log('Client does not have a relay lane to this client.')
      }
    }
    else {
      console.log('Unrecognized message: ' + JSON.stringify(message));
    }

  });

  // back-end interface to the relay server
  return {
    registerClient: function registerClient() {
      let client = {
        id: clients.length,
        numMessages: 0, // used as sequence for callback numbers
        token: hat(),
        channels: {},
        onAuthenticatedMessage: (message) => {

        }
      };
      clients.push(client);

      return { id: client.id, token: client.token };
    },
    registerRelayChannel(clientId1, clientId2) {
      // if there does exist a client with either of the ids
      if (typeof clientId1 !== 'number' || clients[clientId1] === undefined) {
        throw { name: 'ClientNotFoundException', message: 'clientId1 must be the id of an existing client'}
      }
      if (typeof clientId2 !== 'number' || clients[clientId2] === undefined) {
        throw { name: 'ClientNotFoundException', message: 'clientId2 must be the id of an existing client'}
      }
      // if clients already have a channel
      if (clientId1.channels.hasOwnProperty(clientId2) || clientId1.channels.hasOwnProperty(clientId2)) {
        throw { name: 'ClientsAlreadyHaveChannel', message: 'these clients already have a channel'}
      }

      // add channel for client 1
      clients[clientId1].channels[clientId2] = {
        remoteClient: clients[clientId2]
      };

      // add channel for client 2
      clients[clientId2].channels[clientId1] = {
        remoteClient: clients[clientId1]
      };
    }
  }
}

function call(caller, answerer) {
  let answererCallbackNum = answerer.numMessages++;
  wsSendObject(answerer.ws, {
    call: {
      callerId: caller.id,
      callbackNum: answererCallbackNum
    }
  });

  return new Promise(resolve => {
    answerer.ws.on('message', function(message) {
      if (messageSchemas.answer.validate(message).length === 0 && message.num === answererCallbackNum) {
        resolve(message.answer.laneId);
      }
    });
  });
}

function answer(answerer, callbackNum, caller) {
  wsSendObject(caller.ws, {
    answer: {
      answererId: answerer.id
    },
    num: callbackNum
  });
}

function relay(channel, message) {
  wsSendObject(channel.remoteClient.ws, {
    relay: {
      laneId: channel.remoteLaneId,
      message: message
    }
  });
}

function onClose(client) {
  clients[client.id] = undefined;
  console.log('closed');
}

function isValidJSON(string) {
  try {
    JSON.parse(string);
    return true;
  }
  catch (e) {
    return false;
  }
}

/**
 * Stringifies object and sends it through the Web Socket
 * @param ws            ws object or array of ws objects
 * @param obj
 * @param errorCallback
 */
function wsSendObject(ws, obj, errorCallback) {
  ws = Object.prototype.toString.call(ws) === '[Object object]' ? [ws] : ws;

  ws.forEach((socket) => {
    socket.send(JSON.stringify(obj), errorCallback);
  });
}

module.exports = {
  server: server,
  call: call,
  answer: answer,
  relay: relay,
  matchClient: matchClient,
  isValidJSON: isValidJSON
};