"use strict";

let EventEmitter = require('./EventEmitter');

function WebSocketRelay(address, authentication, callback) {
  validateParameters(address, authentication);

  let onMessageCallbacks = [];

  let ws = new WebSocket(address);

  ws.onopen = () => {
    callback();
    wsSendObject(ws, {
      authentication: {
        clientId: authentication.clientId,
        token: authentication.token
      }
    });
  };

  this.createChannel = (targetId) => {
    return new RelayChannel(ws, authentication, targetId, onMessageCallbacks);
  };

  ws.onmessage = (event) => {
    if (isValidJSON(event.message)) {
      let message = JSON.parse(event.message);
      if (message.relay) {
        onMessageCallbacks.forEach((onMessageCallback) => {
          onMessageCallback(message.relay)
        });
      }
    }
  }
}

function RelayChannel(ws, authentication, targetId, onMessageCallbacks) {
  onMessageCallbacks.push(relay => {
      if (relay.senderId === targetId) {
        this.emit('message', [relay.message]);
      }
  });

  this.send = (message) => {
    wsSendObject(ws, {
      authentication: authentication,
      relay: {
        targetId: targetId,
        message: message
      }
    });
  };
}

RelayChannel.prototype = Object.create(EventEmitter.prototype);

function validateParameters(address, authentication) {
  if (address === undefined) {
    throw { name: 'MissingParameterException', message: 'First parameter is required' };
  }
  else if (authentication === undefined) {
    throw { name: 'MissingParameterException', message: 'Second parameter is required' };
  }
  else if (authentication.clientId === undefined) {
    throw { name: 'PropertyRequiredException', message: 'clientId property is required in authentication object' }
  }
  else if (authentication.token === undefined) {
    throw { name: 'PropertyRequiredException', message: 'token property is required in authentication object' }
  }
}

function isValidJSON(string) {
  window.foo = string;
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
function wsSendObject(ws, obj) {
  ws.send(JSON.stringify(obj));
}

module.exports = WebSocketRelay;