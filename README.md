# flow-gpio
GPIO R/W for flow.

## basic rundown
```javascript
function button(pin, cmd) {}
```
provides access to a digital pin - can be read or written, toggled, etc. `pin` should be defined as one of the `wemos.Dx` in the device config. 
```javascript
function dimmer(pin, value) {}
```
provides access to pwm features. value would be a duty cycle, e.g. 0-100.
```javascript
function virtual(pin, cmd) {}
```
implements any virtual features, like SPI, I2C, Serial, etc. create your device with `pin: function (x) { i2c.setup }`
```javascript
function connect() {}
```
Connects to wifi access point.
```javascript
function msgParse(msg) {}
```
Parses any messages recieved from the server via the websocket. Messages are defined somewhere.
```javascript
function wsconnect(state) {}
```
Connects to the websocket server. Should only be called after wifi is connected.

## General flow
start, connect to hardcoded access point, then connect to hardcoded websocket. Then just wait for a message. When it comes, parse it - parsing it currently consists of reading the light sensor. It writes the light sensor values to the websocket.

On the server side, in my case, Node-Red, setup a websocket and `websocket.on('message', function(msg) { console.log(msg); putInDB(msg) });` - something like that. If message comes in, print it, and put it in the DB.
