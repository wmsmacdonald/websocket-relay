"use strict";

let schema = require('validate');

module.exports = {
  relayMessage: schema({
    relay: {
      message: {
        type: 'string',
        required: true
      },
      targetId: {
        type: 'number',
        use: (value) => {
          if (typeof value === 'number') {
            return true;
          }
        }
      }
    }
  }, { strip: false }),
  authentication: schema({
    authentication: {
      clientId: {
        type: 'number',
        use: (value) => {
          if (typeof value === 'number') {
            return true;
          }
        }
      },
      token: {
        type: 'string',
        required: true
      }
    }
  }, { strip: false })
};

