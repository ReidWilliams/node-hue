// When a light is switched on, set it to a default color
// Polls light, looking for transition from off to on (actually unreachable to reachable)
// My initial hope was that by toggling a light from off to on, you could cycle through a set of states
// but the base seems not to check the light states frequently enough to make this work.
// It often takes 10 or more seconds for the reachable state to update once a light is turned off.

'use strict'
var _ = require('underscore');
var constants = require('./constants');
var hue = require("node-hue-api");
var lightState = hue.lightState;
var api = new hue.HueApi(constants.ip, constants.username);
var lightName = require('./lib/LightName');
var huelib = require('./lib/Hue');

var on = lightState.create().on(true).white(450, 60).transition(3000);
var lastPowered = false;

var main = function() {
	if (process.argv.length < 3) {
		usage();
		process.exit(0);
	}

	var lights = lightName.lightsFromNamesOrExit(process.argv.slice(2));
	setInterval(function() {
		_.each(lights, function(light) {
			huelib.lightIsOn(api, light)
			.then(function(isOn) {
				if (isOn === false && lastPowered === true) {
					// light is turned off by a switch
					lastPowered = false;
				}
				if (isOn === true && lastPowered === false) {
					api.setLightState(light.id, on);
					lastPowered = true;
				}
			});
		}); 
	}, 1000);
}

var usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...");
	console.log("Each LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
}

main();