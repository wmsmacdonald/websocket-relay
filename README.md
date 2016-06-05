# websocket-relay
### Easily set up communication channels between clients


On the server:
```javavascript
var RelayServer = require('websocket-relay');
var relayServer = new RelayServer(4000);

var client1 = relayServer.registerClient();
var client2 = relayServer.registerClient();

relayServer.registerRelayChannel(client1.id, client2.id);
```

In the first browser client:
```html
<script type="text/javascript" src="websocket_relay.min.js"></script>
<script type="text/javascript">
var relay = new WebSocketRelay('ws://localhost:4000', {
  clientId: client1.id,
  token: client1.token
});
var channel = relay.createChannel(client2.id);
</script>
```
In the second browser client:
```html
<script type="text/javascript" src="websocket_relay.min.js"></script>
<script type="text/javascript">
var relay = new WebSocketRelay('ws://localhost:4000', {
  clientId: client2.id,
  token: client2.token
});
var channel = relay.createChannel(client1.id);
</script>
```

Now you can freely send and receive data through the channel to the other client:
```html
<script type="text/javascript">
channel.send('hello world');
channe.on('message', function(message) {
  console.log(message);
});
</script>
```
