const VERSION = "1.74",
	w = require( "Wifi" ),
	SSID = "X11",
	ssidPassword = "secret99",
	wemos = {
		D0: null,
		D1: D5,
		D2: D4,
		D3: D0,
		D4: D2,
		D5: D14,
		D6: D12,
		D7: D13,
		D8: D15
	},
	server = "192.168.0.41",
	configMap = [ {
		id: "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: function ( cmd ) {
			I2C1.setup( {
				scl: D5,
				sda: D4
			} );
			var lux = require( "BH1750" )
				.connect( I2C1 );
			lux.start( 1 );
			switch ( cmd ) {
			case "read":
			{
				let x = lux.read();
				WebSock.send( JSON.stringify( [ "reading", {
					device: this.id,
					value: x
				} ] ) );
				break;
			}
			case "readCont":
			{
				let thisRead = setInterval( () => {
					let x = lux.read();
					WebSock.send( JSON.stringify( [ "reading", {
						device: this.id,
						value: x
					} ] ) );
				}, 1000 );
				let thisTimeout = setTimeout( function () {
					clearInterval( thisRead );
				}, 30000 );
				WebSock.on( "close", () => {
					clearInterval( thisRead );
					clearTimeout( thisTimeout );
				} );
				break;
			}
			default:
				break;

			}
		},
		type: "virtual",
		validCmds: [ "read", "readCont" ],
		meta: {
			name: "light",
			metric: "light",
			unit: "lux"
		}
	}, {
		id: "828fbaa2-4f56-4cc5-99bf-57dcb5bd85f5",
		pin: wemos.D5,
		type: "button",
		validCmds: [ "on", "off", "getState" ],
		meta: {
			usage: "Mains Relay"
		}
	}, {
		id: "c6d2a817-0c3a-4b6f-8478-cd81628a63f5",
		pin: function ( cmd ) {
			var dht = require( "DHT22" )
				.connect( wemos.D7 );
			switch ( cmd ) {
			case "read":
			{
				dht.read( ( data ) => {
					WebSock.send( JSON.stringify( [ "reading", {
						device: this.id,
						value: data
					} ] ) );
				} );
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
				name: "rh",
				metric: "humidity",
				unit: "%"
			}, {
				name: "temp",
				metric: "temperature",
				unit: "C",
				validMax: 85,
				validMin: -20
			} ],
			deviceName: "DHT22"
		}
	} ],
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
	w.connect( SSID, {
		password: ssidPassword
	}, ( error ) => {
		if ( error ) {
			console.log( error );
		}
		WebSockconnect( 0 );
	} );
} );
