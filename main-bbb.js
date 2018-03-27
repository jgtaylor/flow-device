var bone = require( "bonescript" );
const server = "192.168.0.41",
	configMap = [ {
		id: "accbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_7",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "bccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_8",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "cccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_9",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_10",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "eccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_11",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "fccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_12",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "gccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_14",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, {
		id: "hccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: "P8_16",
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay",
			color: "Orange"
		}

	}, ],
	WebSocket = require( "ws" );
var WebSock = {};

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
		bone.digitalWrite( d.pin, 1 );
		let retMsg = [ "state", {
			device: d.id,
			mode: bone.getPinMode( d.pin )
				.gpio,
			value: d.pin.read()
		} ];
		WebSock.send( JSON.stringify( retMsg ) );
		break;
	}
	case "off":
	{
		bone.digitalWrite( d.pin, 0 );
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
	//analogRead();
	// on ESP8266, only one pin is analog, so it's not named.
	// TODO: implement this in the configMap device, so it can have a read
	// or write. Note that write is only simulated via toggeling a gpio.
}

function virtual( d, cmd ) {
	d.pin( cmd );
}

function msgParse( msg ) {
	let m = JSON.parse( msg );
	let device = ( map ) => {
		for ( let x = 0; x < map.length; x++ ) {
			if ( map[ x ].id === m[ 1 ].device ) {
				return map[ x ];
			}
		}
	};
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
		origin: "BeagleBoneBlack",
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

WebSockconnect( 0 );
