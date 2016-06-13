"use strict";
const hat = require('hat');
const WebSocketServer = require('uws').Server;
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const messageSchemas = require('./message_schemas');
const log = require('./log');

function Server(options, callback) {
  EventEmitter.call(this);

  let clients = [];
  // TODO end connection and put in ban list (untrusted)
  let serverError = (message) => {
    this.emit('error', message);
  };

  let wss = new WebSocketServer({
    port: options.port
  }, () => {
    if (typeof callback === 'function') {
      callback();
    }
  });

  wss.on('connection', ws => {
    let authentication;

    ws.on('message', message => {
      // if valid json
      if (isValidJSON(message)) {
        message = JSON.parse(message);
        //log.debug('received message');
        //log.debug(message);

        // authentication
        if (messageSchemas.authentication.validate(message).length === 0) {
          authentication = {
            clientId: message.authentication.clientId,
            token: message.authentication.token
          };

          let client = authenticate(authentication, clients);
          if (client) {
            client.ws = ws;
            sendQueuedRelayMessages(client);
          }
          else {
            let error = 'incorrect token';
            ws.close(error);
            serverError(error);
          }
        }

        // relay message
        else if (messageSchemas.relayMessage.validate(message).length === 0) {
          // if client has already authenticated
          if (authentication) {
            let client = authenticate(authentication, clients);
            if (client) {
              client.ws = ws;
              let channel = client.channels[message.relay.targetId];

              // if the channel doesn't exist and authorizeAllChannels is true, create the channel
              if (channel === undefined && options.authorizeAllChannels) {
                this.registerRelayChannel(client.id, message.relay.targetId);
                channel = client.channels[message.relay.targetId];
              }

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
                serverError('client tried to send through a channel that was not registered');
              }
            }
          }
          else {
            let error = 'client not authenticated';
            serverError(error);
          }
        }

        else {
          serverError('Message unrecognized: ' + JSON.stringify(message));
        }
      }
      else {
        serverError('invalid JSON');
      }

    });

  });

  // TODO fix so it doesn't depend on ws internals
  wss.httpServer.on('listening', () => {
    this.emit('listening');
  });

  this.registerClient = function registerClient() {
    let client = {
      id: clients.length,
      token: hat(),
      channels: {},
      relaySendQueue: []
    };
    clients.push(client);

    return { id: client.id, token: client.token };
  };

  this.registerRelayChannel = function registerRelayChannel(clientId1, clientId2) {
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
  };
  this.close = () => {
    // TODO fix so it doesn't use ws internals
    wss.httpServer.close();
    wss.close();
  };
}

util.inherits(Server, EventEmitter);

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

module.exports = Server;