
## basic rundown

Each peripheral on the WemosD1 should be defined in the `configMap` object, on the device itself. On `load()`, a configuration JSON is sent to the websocket server. In this case, it's just Node-Red.

It should look something like this, on the device (WemosD1):
```javascript
[ {
		id: "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: () => {
			I2C1.setup( {
				scl: D5,
				sda: D4
			} );
			var lux = require( "BH1750" )
				.connect( I2C1 );
			lux.start( 1 );
			return lux;
		},
		type: "virtual",
		validCmds: [ "read", "readCont", "readContStop" ],
		meta: {
			metric: "light intensity",
			unit: "lux"
		}
	}, {
		id: "828fbaa2-4f56-4cc5-99bf-57dcb5bd85f5",
		pin: wemos.D4,
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay"
		}
	} ]
```
It is simply an array of objects - your peripherals, with a UUID for each. The websocket addresses the peripheral via its UUID.

To send a command from the websocket Server (Node-Red), all that needs to be sent is an array, described below, in `msgParse()`.

### Function descriptions

```javascript
function button(device, cmd) {}
```
provides access to a digital pin - can be read or written, toggled, etc. `device.pin` should be defined as one of the `wemos.Dx` in the device config.

```javascript
function dimmer(device, value) {}
```
provides access to pwm features. value would be a duty cycle, e.g. 0-100.

```javascript
function virtual(device, cmd) {}
```
implements any virtual features, like SPI, I2C, Serial, etc. create your device with `pin: function (x) { i2c.setup }`

These functions are generic, with the exception of `virtual()`. They will take an object for `device`, which should be one of the objects defined in `configMap`.

### Utility Functions
These are utility functions ...

```javascript
function msgParse(msg) {}
```
Parses any messages received from the server via the websocket. Each message should reference a device in the `configMap`. Message format should look something like:
```json
[ "cmd", { "device": "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3", "cmd": "readCont"}]
```
The device is setup in the `const` declarations at the beginning of main.js, under the variable named `configMap`.

The array is a "packet". index 0 defines what type of packet. there are cmd and config packets.
this command packet is for a specific device. the wemos can have multiple devices, this ensure the correct device is selected.

For a virtual devices, (i2c, etc.), the `cmd: "readCont"` should should be a method of the virtual object. For pwm, the `cmd:` should be a value 0-99, and for button, it should be 'on', 'off'. or 'getState'. Or, define additional methods in the button object (e.g. toggle), and you can call them.

```javascript
function wsconnect(state) {}
```
Connects to the websocket server. Should only be called after wifi is connected.

## General flow

Start, connect to hardcoded access point, then connect to hardcoded websocket. Then just wait for a message. When it comes, parse it - parsing it currently consists of reading the light sensor, and now turning on the blue LED on the WemosD1. It writes the light sensor values to the websocket.

On the server side, in my case, Node-Red, setup a websocket and `websocket.on('message', function(msg) { console.log(msg); putInDB(msg) });` - something like that. If message comes in, print it, and put it in the DB.

### importing the Node-Red flow

You can import the flow by opening `node-red.export`, copying the contents, then, in Node-Red, "import->clipboard", paste the JSON, & Deploy.
