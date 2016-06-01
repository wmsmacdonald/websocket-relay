"use strict";
let testing = require('testing');
let freeport = require('freeport-promise');

let unitTests = require('./unit');

freeport()
  .then(port => {
    let testsWithPort = unitTests.map(test => {
      return test.bind(null, port);
    });
    testing.run(testsWithPort);
  });


