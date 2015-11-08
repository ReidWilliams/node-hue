var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var _ = require('underscore');

_.each(constants.lights, function(light) {
	api.lightStatus(light.id)
    .then(function(status) {
		console.log("light name: " + light.name);
		console.log("light id: " + light.id);
		console.log("====================");
		console.log(JSON.stringify(status, null, 2));
	})
    .done();
});

