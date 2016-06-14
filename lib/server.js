"use strict";
const hat = require('hat');
const WebSocketServer = require('ws').Server;
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const messageSchemas = require('./message_schemas');
const log = require('./log');

function RelayServer(options, callback) {
  EventEmitter.call(this);

  let clients = [];
  // TODO end connection and put in ban list (untrusted)
  let serverError = (message) => {
    this.emit('error', message);
  };

  let wss = new WebSocketServer({
    port: options.port
  }, callback);

  wss.on('connection', ws => {
    let relayClient;
    // saves client id and token
    ws.on('message', message => {
      // if valid json
      if (isValidJSON(message)) {
        relayClient = messageController(ws, JSON.parse(message), relayClient, this);
      }
      else {
        serverError('invalid JSON');
      }
    });
  });

  function messageController (ws, message, relayClient, relayServer) {
    // authentication
    if (messageSchemas.authentication.validate(message).length === 0) {
      return authenticate(ws, message.authentication.clientId, message.authentication.token);
    }

    // relay message
    else if (messageSchemas.relayMessage.validate(message).length === 0) {
      relay(relayClient, message.relay.targetId, message.relay.message, relayServer);
    }

    else {
      serverError('Message unrecognized: ' + JSON.stringify(message));
    }
  }

  function authenticate(ws, clientId, token) {
    let client = authenticateClient(clientId, token, clients);
    // if client authenticated successfully
    if (client) {
      client.ws = ws;
      sendQueuedRelayMessages(client);
      return client;
    }
    else {
      let error = 'incorrect token';
      ws.close();
      serverError(error);
    }
  }

  function authenticateClient(clientId, token) {
    let client = clients[clientId];
    if (client === undefined || client.token !== token) {
      return false;
    }
    return client;
  }

  function relay(relayClient, targetId, relayMessage, relayServer) {
    // if client has already authenticated
    if (relayClient) {
      let channel = relayClient.channels[targetId];

      // if the channel doesn't exist and authorizeAllChannels is true, create the channel
      if (channel === undefined && options.authorizeAllChannels) {
        relayServer.registerRelayChannel(relayClient.id, targetId);
        channel = relayClient.channels[targetId];
      }

      if (channel) {
        let target = channel.targetClient;
        if (channel.targetClient.ws) {
          sendRelayMessage(relayClient.id, channel.targetClient.ws, relayMessage);
        }
        else {
          target.relaySendQueue.push({
            senderId: relayClient.id,
            message: relayMessage
          });
        }
      }
      else {
        serverError('client tried to send through a channel that was not registered');
      }
    }
    else {
      let error = 'client not authenticated';
      serverError(error);
    }
  }

  /*
    Public methods
   */

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
  this.close = (callback) => wss.close(callback);
}

util.inherits(RelayServer, EventEmitter);

function sendQueuedRelayMessages(client) {
  while (client.relaySendQueue.length > 0) {
    let relay = client.relaySendQueue.shift();
    sendRelayMessage(relay.senderId, client.ws, relay.message);
  }
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

module.exports = RelayServer;