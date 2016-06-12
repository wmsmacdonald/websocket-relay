"use strict";
let testing = require('testing');
let freeport = require('freeport-promise');

let clientUnitTests = require('./client_unit');
let serverUnitTests = require('./server_unit');
let serverIntegrationTests = require('./server_integration');
let systemTests = require('./system');

freeport()
  .then(port => {
    testing.run(clientUnitTests, () => {
      console.log('Client tests finished');

      // bind port to first param of all server tests
      testing.run(serverUnitTests.map(test => {
        return test.bind(null, port);
      }), () => {
        console.log('Server tests finished');

        testing.run(serverIntegrationTests.map(test => {
          return test.bind(null, port);
        }), () => {
          console.log('Server integration tests finished');

          testing.run(systemTests.map(test => {
            return test.bind(null, port);
          }), () => {
            console.log('System tests finished');
          });
        });
      });
    });
  });


