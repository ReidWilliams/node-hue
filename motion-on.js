var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var particle = require('./lib/Particle');
var lightState = hue.lightState;
var _ = require('underscore');
var huelib = require('./lib/Hue');
var lightName = require('./lib/LightName');

var main = function() {

	if (process.argv.length < 3) {
		usage();
		process.exit(0);
	}

	var lights = lightName.lightsFromNames(process.argv.slice(2));

	var firstOn = lightState.create().on(true).hsb(100, 30, 0);
	var on = lightState.create().on(true).hsb(100, 30, 50).transition(3000);
	var low = lightState.create().on(true).hsb(250, 100, 0).transition(10000);
	var off = lightState.create().on(false);

	var timerID = 0;
	var stateOn = true;

	setInterval(function() {
		particle.getMotion()
		.then(function(reply) {
			if (reply.result !== 0 && stateOn === false) {
				clearTimeout(timerID);
				_.each(lights, function(light) {
					api.setLightState(light.id, firstOn);
				});
				stateOn = true;
			}
			if (reply.result !== 0 && stateOn === true) {
				_.each(lights, function(light) {
					api.setLightState(light.id, on);
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

main();


