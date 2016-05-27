"use strict";
let testing = require('testing');
let nodeStatic = require('node-static');
let path = require('path');
let http = require('http');
let freeport = require('freeport');
let phantom = require('phantom');
let binPath = require('phantomjs').path;

/*freeport((err, port) => {
  if (err) throw err;
  createStaticServer(port);
  phantom.create().then(testTwoBrowsers);
});*/

function createStaticServer(port) {
  let fileServer = new nodeStatic.Server(path.join(__dirname, 'public'));

  console.log(port);


  let server = http.createServer(function (request, response) {
    request.addListener('end', function () {
      fileServer.serve(request, response);
    }).resume();
  }).listen(port);


  let url = 'http://localhost:' + port + '/index.html';

  phantom.create()
    .then(ph => {
      return ph.createPage()
    })
    .then(page => {
      return page.open(url)
    })
    .then(success => {

    });


  //server.close()

}

function testTwoBrowsers(ph, url) {
  ph.createPage
    .then(page => {
      return page.open(url);
    })
    .then(success => {

    });

  ph.createPage
    .then(page => {
      return page.open(url);
    })
    .then(success => {

    });
}

