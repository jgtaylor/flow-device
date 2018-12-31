var server = "192.168.2.122",
	SSID = "X11",
	ssidPassword = "secret99",
	configMap = [{
		id: "AtlasEC",
		pin: function ( cmd ) {
			let EC_ADDRESS = 100;
			switch ( cmd ) {
			case "read":
			{
				var that = this;
				I2C1.writeTo( EC_ADDRESS, "R" );
				setTimeout( function () {
					let rawData = I2C1.readFrom( EC_ADDRESS, 64 );
					let v = ( parseFloat( ua2text( rawData ).split( "," )[0] ) );
					WebSock.send( JSON.stringify( ["reading", {
						device: that.id,
						value: { EC: v }
					}] ) );
				}, 600 );
				break;
			}
			case "cal":
			{
				console.log( "Calibrate" );
				break;
			}
			case "getCal":
			{
				I2C1.writeTo( EC_ADDRESS, "Cal,?" );
				setTimeout( function () {
					let rawData = I2C1.readFrom( EC_ADDRESS, 8 );
					WebSock.send( JSON.stringify( ["reading", {
						device: that.id,
						value: ua2text( rawData )
					}] ) );
				},
				600 );
				break;
			}
			case "getProbeType":
			{
				I2C1.writeTo( EC_ADDRESS, "K,?" );
				setTimeout( function () {
					let rawData = I2C1.readFrom( EC_ADDRESS, 8 );
					console.log( ua2text( rawData ) );
					WebSock.send( JSON.stringify( ["reading", {
						device: that.id,
						value: parseFloat( ua2text( rawData ) )
					}] ) );
				}, 300 );
				break;
			}
			default:
				break;

			}
		},
		type: "virtual",
		validCmds: ["read", "cal"],
		meta: {
			keys: [{
				name: "EC",
				metric: "EC",
				unit: "mS"
			}],
			deviceName: "AtlasEC"
		}
	},
	{
		id: "AtlasPH",
		pin: function ( cmd ) {
			let PH_ADDRESS = 99;
			switch ( cmd ) {
			case "read":
			{
				var that = this;
				I2C1.writeTo( PH_ADDRESS, "R" );
				setTimeout( function () {
					let rawData = I2C1.readFrom( PH_ADDRESS, 8 );
					let v = ( parseFloat( ua2text( rawData ).split( "," )[0] ) );
					WebSock.send( JSON.stringify( ["reading", {
						device: that.id,
						value: {PH: v}
					}] ) );
				}, 900 );
				break;
			}
			case "cal":
			{
				console.log( "Calibrate" );
				break;
			}
			default:
				break;
			}
		},
		type: "virtual",
		validCmds: ["read", "cal"],
		meta: {
			keys: [{
				name: "PH",
				metric: "PH",
				unit: "PH"
			}],
			deviceName: "AtlasPH"
		}
	}, {
		id: "DS18B20",
		pin: function ( cmd ) {
			var that = this;
			switch ( cmd ) {
			case "read":
			{
				let x = tempSensor.getTemp( ( temp ) => {
					WebSock.send( JSON.stringify( ["reading", {
						device: that.id,
						value: { "Temperature": temp}
					}] ) );
				} );
				break;
			}
			default:
				break;
			}
		},
		type: "virtual",
		validCmds: ["read"],
		meta: {
			keys: [{
				name: "Temperature",
				metric: "Temperature",
				unit: "C"
			}],
			deviceName: "DS18B20"
		}
	}
	];
var w = require( "Wifi" );
var ow = new OneWire( D14 );
var tempSensor = require( "DS18B20" ).connect( ow );
var WebSocket = require( "ws" );
var WebSock = {};

I2C1.setup( {
	scl: D17,
	sda: D16
} );

function ua2text( ua ) {
	var s = "";
	for ( var i = 1; i < ua.length; i++ ) {
		if ( ua[i] !== 0x01 && ua[i] !== 0x00 ) {
			s += String.fromCharCode( ua[i] );
		}
	}
	return s;
}

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
		let retMsg = ["state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		}];
		WebSock.send( JSON.stringify( retMsg ) );
		break;
	}
	case "off":
	{
		digitalWrite( d.pin, 0 );
		let retMsg = ["state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		}];
		WebSock.send( JSON.stringify( retMsg ) );
		break;
	}
	case "getState":
	{
		WebSock.send( JSON.stringify( ["state", {
			device: d.id,
			mode: d.pin.getMode(),
			value: d.pin.read()
		}] ) );
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
			WebSock.send( JSON.stringify( ["reading", {
				device: d.id,
				value: analogRead()
			}] ) );
		}
		break;
	default:
		analogRead();
		break;

	}
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
			if ( map[x].id === m[1].device ) {
				return map[x];
			}
		}
		return {
			id: null,
			pin: null,
			type: null,
			validCmds: null,
			meta: {
				keys: [{
					name: null,
					metric: null,
					unit: null
				}],
				deviceName: null
			}
		};
	}
	switch ( m[0] ) {
	case "cmd":
	{
		let d = device( configMap );
		switch ( d.type ) {
		case "button":
		{
			button( d, m[1].cmd );
			break;
		}
		case "virtual":
		{
			virtual( d, m[1].cmd );
			break;
		}
		case "dimmer":
		{
			dimmer( d, m[1].cmd );
			break;
		}
		default:
			break;
		}
		break;
	}
	case "config":
	{
		WebSock.send( JSON.stringify( ["config", configGen( configMap )] ) );
		break;
	}
	default:
		break;
	}
}

function WebSockconnect( state ) {
	if ( state === 1 ) {
		WebSock.removeAllListeners();
		WebSock = null;
	}
	WebSock = new WebSocket( server, {
		path: "/devices/water",
		port: 1880,
		origin: "MCU",
		keepAlive: 60
	} );
	WebSock.on( "error", ( err ) => {
		setTimeout( function () {
			WebSockconnect( 1 );
		}, 10000 ); // 10 seconds between reconnect attempts.
		console.log( "ERROR: Websocket error: ", err );
	} );
	WebSock.on( "open", () => {
		WebSock.send( JSON.stringify( ["config", configGen( configMap )] ) );
	} );
	WebSock.on( "close", () => {
		WebSockconnect( 1 );
		console.log( "ERROR: Websocket disconnected" );
	} );
	WebSock.on( "message", ( msg ) => {
		msgParse( msg.toString() );
	} );

}

E.on( "init", () => {
	w.stopAP();
	w.on( "disconnected", () => {
		w.connect( SSID, {
			password: ssidPassword
		}, function ( error ) {
			console.log( error );
			w.startAP();
		} );
	} );
	w.on( "connected", function () {
		WebSockconnect( 0 );
	} );

	w.connect( SSID, {
		password: ssidPassword
	}, ( error ) => {
		if ( error ) {
			console.log( error );
			w.startAP();
		}
	} );
} );