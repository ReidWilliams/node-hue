var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var particle = require('./lib-particle');
var lightState = hue.lightState;
var _ = require('underscore');

var light = _.findWhere(constants.lights, {name: 'bookshelf'});

var on = lightState.create().on(true).hsb(50, 50, 100);
var off = lightState.create().on(false);

setInterval(function() {
	particle.getMotion()
	.then(function(reply) {
		if (reply.result !== 0) {
			console.log('on');
			api.setLightState(light.id, on);
		} else {
			console.log('off');
			api.setLightState(light.id, off);
		}
	})
}, 1000);


