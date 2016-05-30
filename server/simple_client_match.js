"use strict";

/**
 *
 * @param client
 * @param clients
 * @returns {boolean || number}   false if no match is found, otherwise the
 */
function simpleClientMatch(client, clients) {

  let peerId = 0;

  // gets the first valid match
  while (peerId < clients.length && (
    // skips possible match if it...
    // is itself
  peerId === client.id
    // is already a peer
  || client.relayLanes.hasOwnProperty(peerId.toString())
    // has been deleted
  || clients[peerId] === undefined)) {

    peerId++;
  }

  return peerId >= clients.length
    ? false
    : clients[peerId];
}