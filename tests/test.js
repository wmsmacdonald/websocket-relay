"use strict";
let testing = require('testing');
let freeport = require('freeport-promise');

let unitTests = require('./unit');
let integrationTests = require('./integration');
let tests = unitTests.concat(integrationTests);

freeport()
  .then(port => {
    let testsWithPort = tests.map(test => {
      return test.bind(null, port);
    });
    testing.run(testsWithPort);
  });


