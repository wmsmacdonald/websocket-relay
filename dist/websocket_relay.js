"use strict";

var peerConnections;
var hello = 'blah';

var log = {
  debug: function debug(obj) {
    this.debugLogs.push(obj);
  },
  debugLogs: [],
  warning: function warning(obj) {
    console.log(obj);
  },
  error: function error(_error) {
    throw _error;
  }
};

function testLatency() {
  var channel = peerConnections[0].channel;
  var start = new Date();
  channel.onmessage = function (event) {
    log.warning(new Date() - start);
  };
  channel.send('test');
}

(function () {
  var signalingServer = new WebSocket(WS_HOST);

  var signalingServerConnectPromise = new Promise(function (resolve, reject) {
    signalingServer.onopen = resolve.bind(null, signalingServer);
  });

  signalingServerConnectPromise.then(function (signalingServer) {
    signalingServer.send(JSON.stringify({
      match: true
    }));
  });

  var peerConnectionIdSeq = 0;
  peerConnections = range(1, function () {
    return createOfferConnection(signalingServerConnectPromise, peerConnectionIdSeq++);
  });

  function createOfferConnection(signalingServerConnectPromise, id) {
    log.debug('creating offer connection');
    var peerConnection = new RTCPeerConnection({ 'iceServers': [{ 'url': 'stun:stun.services.mozilla.com' }, { 'url': 'stun:stun.l.google.com:19302' }] });
    var channel = peerConnection.createDataChannel('datachannel');

    new Promise(function (resolve, reject) {
      channel.onopen = resolve;
    }).then(function () {
      log.debug('channel open');
    });

    /*channel.onmessage = function(message) {
      log.warning(new Date() - start);
    };
     channel.onopen = function() {
      start = new Date();
      channel.send('afsdfs');
    };*/

    var offerPromise = peerConnection.createOffer();

    var numCandidates = 1;

    Promise.all([offerPromise, signalingServerConnectPromise]).then(function (values) {

      wsSendObject(values[1], {
        offer: {
          description: values[0]
        },
        localPeerConnectionId: id
      });
      peerConnection.onicecandidate = function (event) {
        if (event.candidate !== null) {
          log.debug('got local candidate ' + numCandidates++ + ' (offer)');
          wsSendObject(values[1], {
            candidate: event.candidate,
            localPeerConnectionId: id
          });
        }
      };
    });

    offerPromise.then(function (description) {
      log.debug('got local description (offer)');
      return peerConnection.setLocalDescription(description);
    }).then(function () {
      log.debug('local description set (offer)');
    });

    return {
      id: id,
      peerConnection: peerConnection,
      channel: channel
    };
  }

  signalingServerConnectPromise.then(function (signalingServer) {
    signalingServer.onmessage = serverMessageController;
  });

  var numRemoteCandidates = 1;

  function serverMessageController(event) {
    var message = safelyParseJSON(event.data);
    log.debug(message);

    if (message.offer && message.offer.description) {
      // connection and answer need to be created;
      var answerConnection = createAnswerConnection(message.offer.description, message.remoteId, peerConnectionIdSeq++);
      peerConnections.push(answerConnection);
      while (message.offer.candidates.length > 0) {
        answerConnection.peerConnection.addIceCandidate(message.offer.candidates.shift());
        log.debug('added remote candidate ' + numRemoteCandidates++ + ' (answerer)');
      }
    } else if (message.peerConnection && message.message.answer) {
      log.debug('got remote answer');
      var peerConnection = peerConnections.find(function (peerConnection) {
        return peerConnection.id === message.localPeerConnectionId;
      });

      peerConnection.peerConnection.setRemoteDescription(new RTCSessionDescription(message.message.answer.description));
    } else if (message.peerConnection && message.message.candidate) {
      var _peerConnection = peerConnections.find(function (peerConnection) {
        return peerConnection.id === message.localPeerConnectionId;
      });

      _peerConnection.peerConnection.addIceCandidate(message.message.candidate);
      log.debug('added remote candidate ' + numRemoteCandidates++);
    } else if (message.requestOffer) {} else {
      log.error('unrecognized message: ' + JSON.stringify(message));
    }
  }

  function createAnswerConnection(remoteDescription, remoteId, id) {
    log.debug('creating answer connection');
    var peerConnection = new RTCPeerConnection({ 'iceServers': [{ 'url': 'stun:stun.services.mozilla.com' }, { 'url': 'stun:stun.l.google.com:19302' }] });
    var answerPromise = peerConnection.setRemoteDescription(remoteDescription).then(function () {
      return peerConnection.createAnswer();
    });

    answerPromise.then(function (description) {
      return peerConnection.setLocalDescription(description);
    }).then(function () {
      log.debug('set answer local description');
    });

    Promise.all([answerPromise, signalingServerConnectPromise]).then(function (values) {
      log.debug('answer created');
      wsSendObject(values[1], {
        answer: {
          description: values[0]
        },
        targetId: remoteId,
        localPeerConnectionId: id
      });
    });

    var numCandidates = 1;

    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        log.debug('got local candidate ' + numCandidates++ + ' (answer)');
        wsSendObject(signalingServer, {
          candidate: event.candidate,
          localPeerConnectionId: id,
          targetId: remoteId
        });
      }
    };

    var peerInfo = {
      id: id,
      peerConnection: peerConnection
    };

    peerConnection.ondatachannel = function (event) {
      log.debug('got data channel');
      peerInfo.channel = event.channel;

      event.channel.onmessage = function (message) {
        log.warning(message.data);
        event.channel.send(message.data);
      };
    };

    return peerInfo;
  }

  function safelyParseJSON(string) {
    try {
      return JSON.parse(string);
    } catch (e) {
      log.error('Invalid JSON: ' + string);
    }
  }

  function range(length, valueFunction) {
    return Array.apply(null, Array(length)).map(function () {
      return valueFunction();
    });
  }

  function wsSendObject(ws, obj, errorCallback) {
    ws.send(JSON.stringify(obj), errorCallback);
  }
})();