"use strict";

let schema = require('validate');

module.exports = {
  authenticatedMessage: schema({
    authentication: {
      clientId: {
        type: 'number',
        required: true
      },
      token: {
        type: 'string',
        required: true
      }
    },
    message: {
      type: 'object',
      required: false
    }
  })
};

