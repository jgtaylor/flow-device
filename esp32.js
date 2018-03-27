const VERSION = "0.01";
const w = require( "Wifi" );
const SSID = "X11";
const ssidPassword = "secret99";
const server = "192.168.1.36";
const configMap = [ {
	id: "bme280",
	pin: function ( cmd ) {
		var bme = require( "BME280" )
			.connect( I2C1 );
		switch ( cmd ) {
		case "read":
		{
			let x = bme.getData();
			WebSock.send( JSON.stringify( [ "reading", {
				device: this.id,
				value: x
			} ] ) );
			break;
		}
		default:
			break;

		}
	},
	type: "virtual",
	validCmds: [ "read" ],
	meta: {
		keys: [ {
			name: "humidity",
			metric: "humidity",
			unit: "%"
		}, {
			name: "temp",
			metric: "temp",
			unit: "C",
			validMax: 85,
			validMin: -20
		}, {
			name: "pressure",
			metric: "pressure",
			unit: "hPa"
		} ],
		deviceName: "bme280"
	}
}, {
	id: "one",
	pin: D13,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "two",
	pin: D15,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "three",
	pin: D2,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "four",
	pin: D0,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "five",
	pin: D4,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "six",
	pin: D5,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "seven",
	pin: D18,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
}, {
	id: "eight",
	pin: D23,
	type: "button",
	validCmds: [ "on", "off", "getState" ],
	meta: {
		usage: "Mains Relay"
	}
} ];
const WebSocket = require( "ws" );
const relays = [ D13, D15, D2, D0, D4, D5, D18, D23 ];
var WebSock = {};
I2C1.setup( {
	scl: D17,
	sda: D16
} );



function configGen( config ) {
	let ret = [];
	config.forEach( ( el ) => {
		let t = {
			device: el.id,
			type: el.type,
			validCmds: el.validCmds,
			meta: el.meta
		};
		ret.push( t );
	} );
	return ret;
}

function button( d, cmd ) {
	if ( d.pin.getMode() !== "output" ) {
		d.pin.mode( "output" );
	}
	switch ( cmd ) {
	case "on":
	{
		digitalWrite( d.pin, 1 );
		let retMsg = [ "state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		} ];
		WebSock.send( JSON.stringify( retMsg ) );
		break;
	}
	case "off":
	{
		digitalWrite( d.pin, 0 );
		let retMsg = [ "state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		} ];
		WebSock.send( JSON.stringify( retMsg ) );
		break;
	}
	case "getState":
	{
		WebSock.send( JSON.stringify( [ "state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		} ] ) );
		break;
	}
	default:
	{
		break;
	}
	}
}

function dimmer( d, cmd ) {
	switch ( cmd ) {
	case "read":
		{
			WebSock.send( JSON.stringify( [ "reading", {
				device: d.device,
				value: analogRead()
			} ] ) );
		}
		break;
	case "expression":

		break;
	default:

	}
	analogRead();
	// on ESP8266, only one pin is analog, so it's not named.
	// TODO: implement this in the configMap device, so it can have a read
	// or write. Note that write is only simulated via toggeling a gpio.
}

function virtual( d, cmd ) {
	d.pin( cmd );
}

function msgParse( msg ) {
	var m = JSON.parse( msg );

	function device( map ) {
		for ( let x = 0; x < map.length; x++ ) {
			if ( map[ x ].id === m[ 1 ].device ) {
				return map[ x ];
			}
		}
	}
	switch ( m[ 0 ] ) {
	case "cmd":
	{
		let d = device( configMap );
		switch ( d.type ) {
		case "button":
		{
			button( d, m[ 1 ].cmd );
			break;
		}
		case "virtual":
		{
			virtual( d, m[ 1 ].cmd );
			break;
		}
		case "dimmer":
		{
			dimmer( d, m[ 1 ].cmd );
			break;
		}
		default:
			break;
		}
		break;
	}
	case "config":
	{
		WebSock.send( JSON.stringify( [ "config", configGen( configMap ) ] ) );
		break;
	}
	default:
		break;

	}
}


function WebSockconnect( state ) {
	console.log( "Creating the websocket..." );
	if ( state === 1 ) {
		WebSock.removeAllListeners();
		WebSock = null;
	}
	WebSock = new WebSocket( server, {
		path: "/ws/device",
		port: 1880,
		origin: "MCU",
		keepAlive: 60
	} );
	WebSock.on( "open", () => {
		WebSock.send( JSON.stringify( [ "config", configGen( configMap ) ] ) );
		console.log( "[SUCCESS] WebSocket connected." );
	} );
	WebSock.on( "close", () => {
		console.log( "[ERROR] WebSocket closed - reconnecting..." );
		WebSockconnect( 1 );
	} );
	WebSock.on( "message", ( msg ) => {
		msgParse( msg.toString() );
	} );
}

E.on( "init", () => {
	console.log( "Started " + VERSION + ": Connecting..." );

	w.on( "connected", ( details ) => {
		//w.save();
		console.log( details );
	} );
	w.on( "disconnected", ( details ) => {
		console.log( "Wifi disconnected:" + details );
		w.connect( SSID, {
			password: ssidPassword
		}, function ( error ) {
			console.log( error );
		} );
	} );
	console.log( "Reseting all relays to Off" );
	relays.forEach( ( d ) => {
		d.mode( "output" );
		d.write( 0 );
	} );

	w.connect( SSID, {
		password: ssidPassword
	}, ( error ) => {
		if ( error ) {
			console.log( error );
		}
		WebSockconnect( 0 );
	} );
} );