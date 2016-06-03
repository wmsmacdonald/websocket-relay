"use strict";
let hat = require('hat');
let WebSocketServer = require('uws').Server;

let messageSchemas = require('./message_schemas');

function server(port, callback) {
  let clients = [];

  let wss = new WebSocketServer({
    port: port
  }, callback);


  // tracks unrecognized ws messages, etc.
  let errors = [];

  wss.on('connection', ws => {

    ws.on('message', function(message) {
      // if valid json
      if (isValidJSON(message)) {
        message = JSON.parse(message);

        // authentication and message
        if (messageSchemas.authenticatedRelayMessage.validate(message).length === 0) {
          let client = authenticate(message.authentication, clients);
          if (client) {
            client.ws = ws;
            let channel = client.channels[message.relay.targetId];
            if (channel) {
              let target = channel.targetClient;
              if (channel.targetClient.ws) {
                sendRelayMessage(client.id, channel.targetClient.ws, message.relay.message);
                sendQueuedRelayMessages(client);
              }
              else {
                target.relaySendQueue.push({
                  senderId: client.id,
                  message: message.relay.message
                });
              }
            }
            else {
              errors.push('client tried to send through a channel that was not registered');
            }

          }
          else {
            errors.push('incorrect token');
          }
        }

        // just authentication
        else if (messageSchemas.authentication.validate(message).length === 0) {
          let client = authenticate(message.authentication, clients);
          if (client) {
            client.ws = ws;
            sendQueuedRelayMessages(client);
          }
          else {
            errors.push('incorrect token');
          }
        }

        else {
          errors.push('Message unrecognized: ' + JSON.stringify(message).substring(0, 500));
        }
      }
      else {
        errors.push('invalid JSON');
      }

    });

  });

  // interface to the relay server
  return {
    registerClient: function registerClient() {
      let client = {
        id: clients.length,
        token: hat(),
        channels: {},
        relaySendQueue: []
      };
      clients.push(client);

      return { id: client.id, token: client.token };
    },
    registerRelayChannel(clientId1, clientId2) {
      let client1 = clients[clientId1];
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
        targetClient: clients[clientId2]
      };

      // add channel for client 2
      clients[clientId2].channels[clientId1] = {
        targetClient: clients[clientId1]
      };
    },
    close: function close() {
      // HACK: using private method so that server actually terminates
      wss.httpServer.close();
      wss.close();
    },
    // debugging
    _wss: wss,
    errors: errors
  };
}

function sendQueuedRelayMessages(client) {

  while (client.relaySendQueue.length > 0) {
    let relay = client.relaySendQueue.shift();
    sendRelayMessage(relay.senderId, client.ws, relay.message);
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
      senderId: senderId,
      message: message
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
  ws.send(JSON.stringify(obj), errorCallback);
}

module.exports = server;