'use strict'
var constants = require('../constants');
var _ = require('underscore');

exports.lightNamed = function(nameString) {
	return _.findWhere(constants.lights, {name: nameString});
}

exports.lightsFromNamesOrExit = function(nameStrings) {
    var lights = _.map(nameStrings, function(nameString) {
        var light = exports.lightNamed(nameString);
        if (light === undefined) {
            console.log("Couldn't find a light named " + nameString);
            console.log("Available light names are:");
            var lightNames = _.pluck(constants.lights, 'name').join(", ");
            console.log('"' + lightNames + '"');
            process.exit(0);
        }
        return light;
    }); 
    return lights;
}