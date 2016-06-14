"use strict";

let EventEmitter = require('./EventEmitter');

if (typeof WebSocket === 'undefined') {
  var WebSocket = module.require('ws');
}

function WebSocketRelay(address, authentication, callback) {
  validateParameters(address, authentication);

  let relayQueues = {};
  let channels = {};

  let socket = new WebSocket('ws://' + address);

  let self = this;
  socket.onopen = () => {
    if (typeof callback === 'function') {
      callback();
    }
    // make sure to send authentication before opening to send relays
    wsSendObject(socket, {
      authentication: {
        clientId: authentication.clientId,
        token: authentication.token
      }
    });
    self.emit('open');
  };

  this.createChannel = (targetId) => {
    let queuedRelays = relayQueues[targetId];
    let channel = new RelayChannel(socket, targetId, queuedRelays);
    channels[targetId] = channel;
    return channel;
  };

  socket.onmessage = function(event) {
    if (isValidJSON(event.data)) {
      let message = JSON.parse(event.data);
      if (message.relay) {
        let channel = channels[message.relay.senderId];
        if (channel) {
          channel.emit('message', message.relay.message);
        }
        else {
          let queuedRelays = relayQueues[message.relay.senderId];
          if (queuedRelays === undefined) {
            relayQueues[message.relay.senderId] = [message.relay.message];
          }
          else {
            queuedRelays.push(message.relay.message);
          }
        }

      }
      else {
        throw 'unrecognized ws message';
      }
    }
  }
}

WebSocketRelay.prototype = Object.create(EventEmitter.prototype);

function RelayChannel(socket, targetId, queuedRelays) {

  this.send = (message) => {
    wsSendObject(socket, {
      relay: {
        targetId: targetId,
        message: message
      }
    });
  };

  this.emitQueuedMessages = () => {
    if (queuedRelays) {
      while (queuedRelays.length > 0) {
        this.emit('message', queuedRelays.pop());
      }
    }
  }

}

RelayChannel.prototype = Object.create(EventEmitter.prototype);

function validateParameters(address, authentication) {
  if (address === undefined) {
    throw new Error('first parameter is required');
  }
  else if (authentication === undefined) {
    throw new Error('second parameter is required');
  }
  else if (authentication.clientId === undefined) {
    throw new Error('clientId property is required in authentication object');
  }
  else if (authentication.token === undefined) {
    throw new Error('token property is required in authentication object');
  }
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
function wsSendObject(socket, obj) {
  socket.send(JSON.stringify(obj));
}

module.exports = WebSocketRelay;