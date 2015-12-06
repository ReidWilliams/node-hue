var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var particle = require('./lib/Particle');
var lightState = hue.lightState;
var _ = require('underscore');
var huelib = require('./lib/Hue');
var lightName = require('./lib/LightName');
var seneca = require('seneca')().client();

var main = function() {

	if (process.argv.length < 3) {
		usage();
		process.exit(0);
	}

	var lights = lightName.lightsFromNamesOrExit(process.argv.slice(2));
	var low = lightState.create().on(true).hsb(250, 100, 0).transition(10000);
	var off = lightState.create().on(false);

	var timerID = 0;
	var stateOn = true;

	setInterval(function() {
		particle.getMotion()
		.then(function(reply) {
			if (reply.result !== 0 && stateOn === false) {
				clearTimeout(timerID);
				getInitialOnColor().then(function(initColor) {
					_.each(lights, function(light) {
						api.setLightState(light.id, initColor);
					});
				});
				stateOn = true;
			}
			if (reply.result !== 0 && stateOn === true) {
				getFinalOnColor().then(function(onColor) {
					_.each(lights, function(light) {
						api.setLightState(light.id, onColor);
					});
				});
			}
			if (reply.result === 0 && stateOn === true) {
				_.each(lights, function(light) {
					api.setLightState(light.id, low);
				});
				timerID = setTimeout(function() {
					_.each(lights, function(light) {
					api.setLightState(light.id, off);
				});
				}, 10*60*1000);
				stateOn = false;
			}
		})
	}, 1000);
}

var usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...");
	console.log("Each LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
}

// with motion light turned on to this color
var getInitialOnColor = function() {
	var promise = new Promise(function(resolve, reject) {
		seneca.act('role: color, cmd: get-current', function(err, result) {
			if (err) return console.error(err)
			var color = undefined;
			if (result.colortemp !== undefined) {
				color = lightState.create().on(true).white(result.colortemp, 30);
			}

			if (result.hue !== undefined) {
				color = lightState.create().on(true).hsb(result.hue, result.saturation, 30);
			}
			resolve(color);
		});	
	});
	return promise;
}

// light transitions to this color
var getFinalOnColor = function() {
	var promise = new Promise(function(resolve, reject) {
		seneca.act('role: color, cmd: get-current', function(err, result) {
			if (err) return console.error(err)
			var color = undefined;
			if (result.colortemp !== undefined) {
				color = lightState.create().on(true).white(result.colortemp, result.brightness).transition(3000);;
			}

			if (result.hue !== undefined) {
				color = lightState.create().on(true).hsb(result.hue, result.saturation, result.brightness).transition(3000);;
			}
			resolve(color);
		});	
	});
	return promise;
}

main();


