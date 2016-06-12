'use strict';

module.exports = {
  error: (...args) => {
    if (process.env.ENVIRONMENT === 'dev') {
      throw new Error(args);
    }
    else {
      console.log(...args);
    }
  },
  debug: (...args) => {
    if (process.env.ENVIRONMENT === 'dev') {
      console.log(...args);
    }
  }
};
