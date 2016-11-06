// Current version turns on office light when there's motion
// this code has an adaptive algorithm that extends the time the
// light is on the more often it is turned on.

const hue = require("node-hue-api");
const constants = require('./constants');
const api = new hue.HueApi(constants.ip, constants.username);
const particle = require('./lib/Particle');
const lightState = hue.lightState;
const huelib = require('./lib/Hue');
const lightName = require('./lib/LightName');

let senseInterval = 10; // seconds

const startingSenseInterval = senseInterval;
let senseTimerHandle = null;
let motionSticky = false;

// called whenever motion is seen
const onMotion = function() {
	console.log(`saw motion, setting timer to ${senseInterval} seconds`)
	turnLightsOn();
	motionSticky = true;
	clearTimeout(senseTimerHandle);
	// set a timer that determines next time to see if there's been motion
	senseTimerHandle = setTimeout(senseTimerExpired, senseInterval * 1000);
}

const senseTimerExpired = function() {
	console.log(`sense timer expired`)
	if (motionSticky) {
		// there was motion at any point in last sense interval
		motionSticky = false;
		// increase sense interval
		senseInterval = increasedSenseInterval(senseInterval);
		console.log(`there was motion during sense period, now setting timer for ${senseInterval} seconds`);
		clearTimeout(senseTimerHandle);
		// set timer again and wait another sense interval
		// lights should already be on, so they'll stay on
		senseTimerHandle = setTimeout(senseTimerExpired, senseInterval * 1000);
	} else {
		// no motion in last sense interval
		// set sense interval back to default and turn lights off
		senseInterval = startingSenseInterval;
		console.log(`no motion in sense interval, sense interval is now ${senseInterval}`);
		turnLightsOff();
	}
}

const increasedSenseInterval = function(t) {
	// double until 15 minutes
	return Math.min(t*2, 15 * 60);
}

// turn light to low on then fade to on. Turn light to low off, then fade to off
var lights = null; // set by main from argv
const lowOn = lightState.create().on(true).hsb(100, 30, 0);
const on = lightState.create().on(true).white(325, 100	).transition(3000);
const lowOff = lightState.create().on(true).hsb(250, 100, 0).transition(10000);
const off = lightState.create().on(false);

// used to transition between low on to on and low off to off states.
let lightTimer = null;
let _lightState = 'off'; // off, lowOff, on, lowOn

const turnLightsOn = function() {
	if (_lightState === 'off') {
		// set to lowOn, wait, On
		clearTimeout(lightTimer);
		setLights(lights, lowOn);	
		_lightState = 'lowOn';
		lightTimer = setTimeout(function() {
			setLights(lights, on);
			_lightState = 'on';		
		}, 1000)
	} else if (_lightState === 'lowOff') {
		// straight to on
		clearTimeout(lightTimer);	
		setLights(lights, on);
		_lightState = 'on';		
	}
	// if _lightState is lowOn or on, do nothing
}

const turnLightsOff = function() {
	if (_lightState === 'on' || _lightState === 'lowOn') {
		clearTimeout(lightTimer);
		setLights(lights, lowOff);
		_lightState = 'lowOff';
		lightTimer = setTimeout(function() {
			setLights(lights, off);
			_lightState = 'off';
		}, 10000)
	} 
}

const setLights = function(lights, lightState) {
	lights.forEach(function(light) {
		api.setLightState(light.id, lightState);
	})
}

const main = function() {
	if (process.argv.length < 3) {
		usage();
		process.exit(0);
	}

	console.log(`starting`);
	lights = lightName.lightsFromNamesOrExit(process.argv.slice(2));
	setLights(lights, off);

	let particleCallInProgress = false;
	setInterval(function() {
		if (!particleCallInProgress) {
			particleCallInProgress = true;
			particle.getMotion()
			.then(function(reply) {
				particleCallInProgress = false;
				if (reply.return_value !== 0) {
					onMotion();
				}
			})
		}
	}, 1000);
}

const usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...");
	console.log("Each LIGHTNAME is the name of a light defined in constants.js:");
	var lightNames = _.pluck(constants.lights, 'name').join(", ");
	console.log('"' + lightNames + '"');
}

main();


