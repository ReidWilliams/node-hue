'use strict';

var _ = require('underscore');

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
                debugger;
                api.setLightState(light.id, _ls)
                .then(function(err) {
                    index = (index + 1) % lightStateList.length;
                    debugger;
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