var hue = require("node-hue-api");
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var particle = require('./lib-particle');
var lightState = hue.lightState;
var _ = require('underscore');

var light = _.findWhere(constants.lights, {name: 'bookshelf'});

var timeOff = 10000;

var firstOn = lightState.create().on(true).hsb(250, 100, 0);
var on = lightState.create().on(true).hsb(50, 50, 100).transition(3000);
var low = lightState.create().on(true).hsb(250, 100, 0).transition(timeOff);
var off = lightState.create().on(false);

var timerID = 0;
var stateOn = true;

setInterval(function() {
	particle.getMotion()
	.then(function(reply) {
		if (reply.result !== 0 && stateOn === false) {
			api.setLightState(light.id, firstOn);
			stateOn = true;
		}
		if (reply.result !== 0 && stateOn === true) {
			console.log('on');
			api.setLightState(light.id, on);
		}
		if (reply.result === 0 && stateOn === true) {
			console.log('off');
			api.setLightState(light.id, low);
			timerID = setTimeout(function() {
				api.setLightState(light.id, off);
			}, timeOff);
			stateOn = false;
		}
	})
}, 1000);


