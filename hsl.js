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
	var hue = process.argv[3];
	var saturation = process.argv[4];
	var brightness = parseInt(process.argv[5]);

	var ls = lightState.create().on(true).hsb(hue, saturation, brightness);
	api.setLightState(light.id, ls);
}

var usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME HUE SATURATION BRIGHTNESS");
	console.log("LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
	console.log("HUE is a value between 0 and 359");
	console.log("SATURATION is a value between 0 and 100");
	console.log("BRIGHTNESS is a value between 0 and 100");
}

main();