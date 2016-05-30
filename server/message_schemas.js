"use strict";

let schema = require('validate');

module.exports = {
  authentication: schema({
    authentication: {
      clientId: {
        type: 'number',
        required: true
      },
      token: {
        type: 'string',
        required: true
      }
    }
  }),

  call: schema({
    call: {
      laneId: {
        type: 'number',
        required: true
      }
    },
    callbackNum: {
      type: 'number',
      required: true
    }
  }),

  answer: schema({
    answer: {
      laneId: {
        type: 'number',
        required: true
      }
    }
  }),

  relay: schema({
    relay: {
      remoteClientId: {
        type: 'number',
        required: 'true'
      },
      message: {
        type: 'string',
        required: 'true'
      }
    }
  })
};

