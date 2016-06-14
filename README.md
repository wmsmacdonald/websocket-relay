# websocket-relay
### Easily set up communication channels between browser clients
#### Great for creating WebRTC signaling servers


On the server:
```javascript
var RelayServer = require('websocket-relay');
var relayServer = new RelayServer({ port: 4000 });

var client1 = relayServer.registerClient();
var client2 = relayServer.registerClient();

console.log(client1.id, client1.token); // => 0 11ac27cd0c17bd1c7ba9aa4285979aea
console.log(client2.id, client2.token); // => 1 7c2e2bc62cb06d7b90651cd4a2f369fb

relayServer.registerRelayChannel(client1.id, client2.id);
```

In the first browser client:
```html
<script type="text/javascript" src="websocket_relay.min.js"></script>
<script type="text/javascript">
var relay = new WebSocketRelay('localhost:4000', {
  clientId: 0,
  token: '11ac27cd0c17bd1c7ba9aa4285979aea',
});
var channel = relay.createChannel(1);
</script>
```
In the second browser client:
```html
<script type="text/javascript" src="websocket_relay.min.js"></script>
<script type="text/javascript">
var relay = new WebSocketRelay('localhost:4000', {
  clientId: 1,
  token: '7c2e2bc62cb06d7b90651cd4a2f369fb'
});
var channel = relay.createChannel(0);
</script>
```

Now you can freely send and receive data through the channel to the other browser client:
```html
<script type="text/javascript">
channel.send('hello world');
channel.on('message', function(message) {
  console.log(message);
});
</script>
```
# Server

## Class: RelayServer
This class represents a WebSocket relay server. It is an `EventEmitter`.

### new RelayServer(options, [callback])
* `options` Object
  * `port` Number
  * `authorizeAllChannels` Boolean
* `callback` Function

Construct a new server object.

### options.authorizeAllChannels
Whether to allow relay channels between clients without registration. Default `false`.

### server.close([callback])

Close the server and terminate all clients, calls callback when done with an error if one occured. Must be called after the RelayServer constructor calls its callback.

### Event: 'error'

`function (error) { }`

If the underlying server emits an error, it will be forwarded here. If there is no listener, it will throw the error.

# Client
## Class: WebSocketRelay
This class represents a connection to a WebSocket relay server. It is an `EventEmitter`.

### new WebSocketRelay(address, authentication, [callback])
* `address` String
* `authentication` Object
  * `clientId` Number
  * `token` String
* `callback` Function

`address` is the host and port of the relay server. When it connects with the relay server `callback` is called.

### authentication.clientId
ID of the client returned from registration on the server.

### authentication.token
Client's authentication token.

### relay.createChannel(targetClientId)
* `targetClientId` Number

Returns an instance of `RelayChannel` that represents a bidirectional channel with the target client.

## Class: RelayChannel
Represents a bidirectional channel with a target client. It is an `EventEmitter`.

### channel.send(message)
* `message` String

Sends the message to other client. If the other client has not connected the relay server yet, the message will be queued. Only string messages are supported.

### channel.emitQueuedMessages()
Emits each queued message (the messages were received before the channel was created).

### Event: 'message'

`function (message) { }`

The client received a relay message

### Event: 'open'

`function () { }`

The client formed a connection with the relay server (`channel.send()` can be called).

# Testing

`npm test`

Try upgrading node if you receive syntax errors.

### Compiling Client Code

`npm compile`
