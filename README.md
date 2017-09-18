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
message format should look something like:
```json
[ "cmd", { "device": "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3", "cmd": "readCont"}]
```
the device is setup in the `const` declarations at the begining of main.js.
the array is a "packet". index 0 defines what type of packet. there are cmd and config packets.
this command packet is for a specific device. the wemos can have multiple devices, this ensure the correct device is selected.
for a virtual devices, (i2c, etc.), the `cmd: "readCont"` should should be a method of the virtual object. For pwm, the `cmd:` should be a value 0-99, and for button, it should be either 'on' or 'off'. Or, define additional methods in the button object, and you can call them. 
```javascript
function wsconnect(state) {}
```
Connects to the websocket server. Should only be called after wifi is connected.

## General flow
start, connect to hardcoded access point, then connect to hardcoded websocket. Then just wait for a message. When it comes, parse it - parsing it currently consists of reading the light sensor. It writes the light sensor values to the websocket.

On the server side, in my case, Node-Red, setup a websocket and `websocket.on('message', function(msg) { console.log(msg); putInDB(msg) });` - something like that. If message comes in, print it, and put it in the DB.
