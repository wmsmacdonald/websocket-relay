let WebSocketServer = require('ws').Server;

let messageSchemas = require('./message_schemas');

function server(options) {
  let wss = new WebSocketServer({port: options.port});

  let clients = [];

  wss.on('connection', ws => {
    caller = {
      id: clients.length,
      numMessages: 0, // used as sequence for callback numbers
      ws: ws,
      lanes: {}
    };
    clients.push(caller);

    ws.on('message', function(message) {
      // if valid json
      if (isValidJSON(message)) {
        message = JSON.parse(message);

        // if message fits call message schema
        if (messageSchemas.call.validate(message).length === 0) {
          let answerer = typeof options.matchClient == "function"
            ? options.matchClient(caller, clients)
            : matchClient(caller, clients);

          if (answerer) {
            caller.lanes[answerer.id] = {
              remoteClient: answerer
            };
            answerer.lanes[caller.id] = {
              remoteClient: caller
            };

            // laneId identifies the relay lane on the client side
            caller.lanes[answerer.id].localLaneId = message.call.laneId;
            answerer.lanes[caller.id].remoteLaneId = message.call.laneId;

            call(caller, answerer)
            // got answer
              .then((laneId) => {
                caller.lanes[answerer.id].remoteLaneId = laneId;
                answerer.lanes[caller.id].localLaneId = laneId;
                answer(answerer, caller, message.callbackNum);
              });
          }
        }
      }

    });

    if (messageSchemas.relay.validate(message).length === 0) {
      // if client has a relay connection to the target
      if (client.lanes.hasOwnProperty(String(message.relay.remoteClientId))) {

        relay(client.lanes[message.relay.remoteClientId], message.relay.message);
      }
      else {
        console.log('Client does not have a relay lane to this client.')
      }
    }
    else {
      console.log('Unrecognized message: ' + JSON.stringify(message));
    }

  });

}

function relay(lane, message) {
  wsSendObject(lane.remoteClient.ws, {
    relay: {
      laneId: lane.remoteLaneId,
      message: message
    }
  });
}

function call(caller, answerer) {
  let answererCallbackNum = answerer.numMessages++;
  wsSendObject(answerer.ws, {
    call: {
      callerId: caller.id,
      callbackNum: answererCallbackNum
    }
  });

  return Promise((resolve, reject) => {
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

function onClose(client) {
  clients[client.id] = undefined;
  console.log('closed');
}

function matchClient(client, clients) {

  let peerId = 0;

  // gets the first valid match
  while (peerId < clients.length && (
    // skips possible match if it...
    // is itself
  peerId === client.id
    // is already a peer
  || client.relayLanes.hasOwnProperty(peerId.toString())
    // has been deleted
  || clients[peerId] === undefined)) {

    peerId++;
  }

  return peerId >= clients.length
    ? false
    : clients[peerId];
}

function isValidJSON(string) {
  try {
    JSON.parse(string);
    return true;
  }
  catch (e) {
    return false;
  }
}d

/**
 *
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