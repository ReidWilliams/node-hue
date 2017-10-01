// repeatedly sets light to given light state
// useful for lights that might be turned off by switch
// and when they're turned on, sets to a different state
// than the power on default.

var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var lightState = hue.lightState;
var _ = require('underscore');

var main = function() {
	if (process.argv.length < 6) {
		usage();
		process.exit(0);
	}

	var light = _.findWhere(constants.lights, {name: process.argv[2]});
	var color = process.argv[3];
	var brightness = parseInt(process.argv[4]);
	var seconds = parseInt(process.argv[5]);

	setInterval(function() {
		var ls = lightState.create().on(true).white(color, brightness);
		api.setLightState(light.id, ls);
	}, seconds * 1000);
}

var usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME COLOR BRIGHTNESS SECONDS");
	console.log("LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
	console.log("COLOR is a value between 154 (cool) and 500 (warm)");
	console.log("SECONDS is how often to try setting the light to the given color/brightness")
}

main();