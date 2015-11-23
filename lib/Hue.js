'use strict';
var _ = require('underscore');
var Promise = require('promise');

// Transition between a list of lightstates
// Returns an object with two functions: start() and stop()
// transitionTime is in milliseconds
// lights is list of dictionaries, with a light id attribute
exports.cycle = function (api, lightStateList, transitionTime, lights) {
    var lightTimer;
    var object = {};
    
    object.start = function() {
        var index = 0;

        var doCycle = function() {
            var _ls = lightStateList[index].transition(transitionTime);
            _.each(lights, function(light) {
                api.setLightState(light.id, _ls)
                .then(function(err) {
                    index = (index + 1) % lightStateList.length;
                });
            });
        }

        doCycle();
        lightTimer = setInterval(doCycle, transitionTime);
    }

    object.stop = function() {
        clearInterval(lightTimer);
    }

    return object;
}

// Returns on / off status of light with the given id.
// Here on off refers to whether the light is powered.
// Returns promise that resolves to a boolean.
exports.lightIsOn = function(api, light) {
    return api.lightStatus(light.id)
    .then(function(status) {
        console.log(status.state.reachable);
        var promise = Promise.resolve(status.state.reachable);
        return promise;
    });
}
