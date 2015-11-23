var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var lightState = hue.lightState;
var _ = require('underscore');

var main = function() {
	if (process.argv.length < 5) {
		usage();
		process.exit(0);
	}

	var light = _.findWhere(constants.lights, {name: process.argv[2]});
	var color = process.argv[3];
	var brightness = parseInt(process.argv[4]);

	var ls = lightState.create().on(true).white(color, brightness);
	api.setLightState(light.id, ls);
}

var usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME COLOR BRIGHTNESS");
	console.log("LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
	console.log("COLOR is a value between 154 (cool) and 500 (warm)");
}

main();