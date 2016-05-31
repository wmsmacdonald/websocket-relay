"use strict";
let hat = require('hat');
let WebSocketServer = require('ws').Server;

let messageSchemas = require('./message_schemas');

function server(port, callback) {
  let clients = [];

  let wss = new WebSocketServer({
    port: port
  }, callback);

  wss.on('connection', ws => {

    ws.on('message', function(message) {
      // if valid json
      if (isValidJSON(message)) {
        message = JSON.parse(message);

        // if message fits authenticate message schema
        if (messageSchemas.authenticatedMessage.validate(message).length === 0) {
          let client = authenticate(message.authentication);
          if (client) {
            if (message.message !== undefined) {
              client.onAuthenticatedMessage(message.message);
            }
            while (client.relaySendQueue.length > 1) {
              sendRelayMessage(ws, null, message);
            }
          }
          else {
            console.log('incorrect token');
            close();
          }
        }
      }

    });

    if (messageSchemas.relay.validate(message).length === 0) {
      // if client has a relay connection to the target
      if (client.channels.hasOwnProperty(String(message.relay.remoteClientId))) {
        sendRelayMessage(client.channels[message.relay.remoteClientId], message.relay.message);
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

          if (message.relay) {
            // if client is allowed to relay messages to remote client
            if (client.channels.hasOwnProperty(message.relay.remoteClientId)) {
              let channel = client.channels[message.relay.remoteClientId];
              if (channel.remoteChannelId === undefined) {
                channel.relaySendQueue.push(message);
              }
              else {
                sendRelayMessage(channel.client.ws, channel.client.id, message.relay.message);
              }
            }
          }
        }
      };
      clients.push(client);

      return { id: client.id, token: client.token };
    },
    registerRelayChannel(clientId1, clientId2) {
      let client1 = clients[clientId1]
      let client2 = clients[clientId2];
      // if there does exist a client with either of the ids
      if (typeof clientId1 !== 'number' || client1 === undefined) {
        throw { name: 'ClientNotFoundException', message: 'clientId1 must be the id of an existing client'}
      }
      if (typeof clientId2 !== 'number' || client2 === undefined) {
        throw { name: 'ClientNotFoundException', message: 'clientId2 must be the id of an existing client'}
      }
      // if clients already have a channel
      if (client1.channels.hasOwnProperty(clientId2) || client2.channels.hasOwnProperty(clientId2)) {
        throw { name: 'ClientsAlreadyHaveChannel', message: 'these clients already have a channel'}
      }

      // add channel for client 1
      clients[clientId1].channels[clientId2] = {
        relaySendQueue: [],
        remoteClient: clients[clientId2]
      };

      // add channel for client 2
      clients[clientId2].channels[clientId1] = {
        relaySendQueue: [],
        remoteClient: clients[clientId1]
      };
    },
    close: function close() {
      clients.forEach(client => {
        if (client.ws) {
          client.ws.close();
        }
      });
      wss.close();
    }
  }
}

function authenticate(authentication, clients) {
  let client = clients[authentication.clientId];
  if (client === undefined || client.token !== authentication.token) {
    return false;
  }
  return client;
}

function sendRelayMessage(senderId, recipientWs, message) {
  wsSendObject(recipientWs, {
    relay: {
      remoteClientId: senderId,
      message: {
        message
      }
    }
  });
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

module.exports = server;