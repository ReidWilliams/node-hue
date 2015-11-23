'use strict'
var spark = require('spark');
var constants = require('../particle-constants');

// returns a promise
exports.getMotion = function() {
	return spark.login({accessToken: constants.token})
	.then(function() {
		return spark.getDevice(constants.device);
	}).then(function(device) {
		return device.getVariable('pirThere');
	});
}

