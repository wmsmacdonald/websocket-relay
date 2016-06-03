"use strict";

let WebSocketRelay = require('./WebSocketRelay');

if (typeof window === 'undefined') {
  module.exports = WebSocketRelay;
}
else {
  window.WebSocketRelay = WebSocketRelay;
}