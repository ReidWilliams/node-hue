var hue = require('node-hue-api');
var constants = require('./constants');
var api = new hue.HueApi(constants.ip, constants.username);
var lightState = hue.lightState;
var _ = require('underscore');
var helpers = require('./lib/hue');
var colors = require('./colors');


var lightStateList = [];
// lightStateList.push(lightState.create().on(true).hsb(colors.red, 100, 100));
// lightStateList.push(lightState.create().on(true).hsl(colors.orange, 100, 100));
// lightStateList.push(lightState.create().on(true).hsl(colors.yellow, 100, 100));
// lightStateList.push(lightState.create().on(true).hsl(colors.green, 100, 100));
lightStateList.push(lightState.create().on(true).hsb(colors.blue, 100, 100));
lightStateList.push(lightState.create().on(true).hsb(colors.blue, 100, 0));

// lightStateList.push(lightState.create().on(true).hsl(colors.purple, 100, 100));

var cycle = helpers.cycle(api, lightStateList, 3*1000, constants.lights);
cycle.start();