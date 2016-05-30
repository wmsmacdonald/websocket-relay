"use strict";

let path = require('path');

module.exports = {
  server: require(path.join(__dirname, 'server', 'server'))
};