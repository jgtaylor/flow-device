/* eslint-disable no-console */
const VERSION = "1.72n",
	w = require("Wifi"),
	SSID = "X11",
	ssidPassword = "secret99",
	wemos = {
		D0: "",
		D1: D5,
		D2: D4,
		D3: D0,
		D4: D2,
		D5: D14,
		D6: D12,
		D7: D13
	},
	configMap = [{
		id: "dccbaa81-b2e4-46e4-a2f4-84d398dd86e3",
		pin: () => {
			I2C1.setup({
				scl: D5,
				sda: D4
			});
			var lux = require("BH1750").connect(I2C1);
			lux.start(1);
			return lux;
		},
		type: "virtual",
		validCmds: ["read", "readCont", "readContStop"],
		meta: {
			metric: "light intensity",
			unit: "lux"
		}
	}, {
		id: "828fbaa2-4f56-4cc5-99bf-57dcb5bd85f5",
		pin: wemos.D4,
		type: "button",
		validCmds: ["on", "off", "getState"],
		meta: {
			usage: "Mains Relay"
		}
	}],
	WebSocket = require("ws");
var ws = {};

function configGen(config) {
	let ret = [];
	config.forEach((el) => {
		let t = {
			device: el.id,
			type: el.type,
			validCmds: el.validCmds,
			meta: el.meta
		};
		ret.push(t);
	});
	return ret;
}

function button(pin, cmd) {
	if (cmd === "on") {
		digitalWrite(pin, 0);
	} else if (cmd === "off") {
		digitalWrite(pin, 1);
	}
}

function dimmer(pin, value) {
	analogWrite(pin, value);
}

function virtual(pin, cmd) {
	switch (cmd) {
	case "read": {
		let x = pin().read().toString();
		ws.send(x);
		break;
	}
	case "readCont": {
            // set a timeout of 5 mins.
		let thisRead = setInterval(() => {
			let x = pin().read().toString();
			ws.send(x);
		}, 1000);
		let thisTimeout = setTimeout(function() {
			clearInterval(thisRead);
		}, 300000);
		ws.on("close", () => {
			clearInterval(thisRead);
			clearTimeout(thisTimeout);
		});
		break;
	}
	default: {
		break;
	}
	}
}

function connect() {
	w.on("disconnected", () => {
		w.connect(SSID, {
			password: ssidPassword
		}, function(error) {
			console.log(error);
		});
	});
}

function msgParse(msg) {
	let m = JSON.parse(msg);
	let device = (map) => {
		for (let x = 0; x < map.length; x++) {
			if (map[x].id === m[1].device) {
				return map[x];
			}
		}
	};
	switch (m[0]) {
	case "cmd": {
		let d = device(configMap);
		switch (d.type) {
		case "button": {
			button(d.pin, m[1].cmd);
			break;
		}
		case "virtual": {
			virtual(d.pin, m[1].cmd);
			break;
		}
		case "dimmer": {
			dimmer(d.pin, m[1].cmd);
			break;
		}
		default: {
			break;
		}
		}
		break;
	}
	case "config": {
		break;
	}
	default: {
		break;
	}
	}
}

function wsconnect(state) {
	console.log("Creating the websocket...");
	if (state === 1) {
		ws.removeAllListeners();
		ws = null;
	}
	ws = new WebSocket("192.168.0.5", {
		path: "/ws/josh",
		port: 1880,
		origin: "MCU",
		keepAlive: 60
	});
	ws.on("open", () => {
		ws.send(JSON.stringify(configGen(configMap)));
	});
	ws.on("close", () => {
		wsconnect(1);
	});
	ws.on("message", (msg) => {
		msgParse(msg.toString());
	});
}

E.on("init", () => {
	console.log("Started " + VERSION + ": Connecting...");
	connect();
	w.stopAP();
	w.connect(SSID, {
		password: ssidPassword
	}, (error) => {
		if (error) {
			console.log(error);
		}
		wsconnect(0);
	});
});
