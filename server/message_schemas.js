let schema = require('validate');

module.exports = {
  callMessage: schema({
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

