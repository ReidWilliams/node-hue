// Current version turns on office light when there's motion
// this code has an adaptive algorithm that extends the time the
// light is on the more often it is turned on.

const hue = require("node-hue-api")
const moment = require("moment")
const constants = require('./constants')
const api = new hue.HueApi(constants.ip, constants.username)
const particle = require('./lib/Particle')
const _ = require('underscore')
const lightState = hue.lightState
const huelib = require('./lib/Hue')
const lightName = require('./lib/LightName')

const debug = function(m) { console.log(`${moment().format('MMM DD hh:mm:ss')}     ${m}`) }

const lightIntervals = [10, 10, 60, 30*60 ] // seconds
const senseIntervals = [10, 5*60, 5*60, 5*60 ]
let lightIntervalIndex = 0

let senseTimerHandle = null
let lightTimerHandle = null
let motionSticky = false

// used to temporarily override motion
let ignoreMotion = false

// called whenever motion is seen
const onMotion = function() {
	if (ignoreMotion) { return }
	debug(`.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  MOTION`)
	motionSticky = true
	turnLightsOn()
	clearTimeout(lightTimerHandle)
	lightTimerHandle = setTimeout(turnLightsOff, getLightInterval() * 1000)

	// set a timer that determines next time to see if there's been motion
	// set twice as long as light is on, so that user can wave to turn light on
	// when it goes off, and process is still sensing
	if (!senseTimerHandle) {
		senseTimerHandle = setTimeout(senseTimerExpired, getSenseInterval() * 1000)
		debug(`LIGHT set (${getLightInterval()} s)`)
		debug(`                     SENSE set (${getSenseInterval()} s)`)
	} else {
		debug(`LIGHT set (${getLightInterval()} s)`)
	}
}

const onHighMotion = function() {
	debug(`saw lots of motion, setting interval to max`)
	lightIntervalIndex = lightIntervals.length - 1
}

const senseTimerExpired = function() {
	debug(`                     SENSE expired`)
	senseTimerHandle = null
	if (motionSticky) {
		motionSticky = false
		increaseLightInterval()
		// set timer again and wait another sense interval
		debug(`                     SENSE set (${getSenseInterval()} s)`)
		senseTimerHandle = setTimeout(senseTimerExpired, getSenseInterval() * 1000)
	} else {
		// no motion in last sense interval
		// set sense interval back to default and turn lights off
		resetLightInterval()
	}
}

const getLightInterval = function() {
	return lightIntervals[lightIntervalIndex]
}

const getSenseInterval = function() {
	return senseIntervals[lightIntervalIndex]
}

const increaseLightInterval = function() {
	// don't increase past length of array
	lightIntervalIndex = Math.min(lightIntervalIndex + 1, lightIntervals.length - 1)
}

const maxLightInterval = function() {
	lightIntervalIndex = lightIntervals.length - 1;
}

const resetLightInterval = function() {
	lightIntervalIndex = 0
}

// light controls
// turn light to low on then fade to on. Turn light to low off, then fade to off
var lights = null // set by main from argv
const lowOn = lightState.create().on(true).hsb(250, 100, 0)
const on = lightState.create().on(true).white(325, 100	).transition(3000)
const userSignalLightsOn = lightState.create().on(true).hsb(300, 100, 100).transition(1000)
const lowOff = lightState.create().on(true).hsb(250, 100, 0).transition(120000)
const fastLowOff = lightState.create().on(true).hsb(250, 100, 0).transition(3000)
const off = lightState.create().on(false)

// used to transition between low on to on and low off to off states.
let lightTimer = null
let _lightState = 'off' // off, lowOff, on, lowOn

const turnLightsOn = function() {
	if (isDaytime()) { return }
	if (_lightState === 'off') {
		// set to lowOn, wait, On
		clearTimeout(lightTimer)
		setLights(lights, lowOn)	
		_lightState = 'lowOn'
		lightTimer = setTimeout(function() {
			setLights(lights, on)
			_lightState = 'on'		
		}, 1000)
	} else if (_lightState === 'lowOff') {
		// straight to on
		clearTimeout(lightTimer)	
		setLights(lights, on)
		_lightState = 'on'		
	}
	// if _lightState is lowOn or on, do nothing
}

const turnLightsOff = function() {
	if (_lightState === 'on' || _lightState === 'lowOn') {
		debug(`LIGHT expired`)
		clearTimeout(lightTimer)
		setLights(lights, lowOff)
		_lightState = 'lowOff'
		lightTimer = setTimeout(function() {
			setLights(lights, off)
			_lightState = 'off'
		}, 120000)
	} 
}

// user request lights on
const userOn = function() {
	debug('user request lights on')
	ignoreMotion = true
	maxLightInterval()
	setLights(lights, userSignalLightsOn)
	setTimeout(function() {
		ignoreMotion = false
		setLights(lights, on)
		_lightState = 'on'
	}, 5000)
}

// user request lights off
const userOff = function() {
	debug('user request lights off')
	ignoreMotion = true
	resetLightInterval()
	setLights(lights, fastLowOff)
	_lightState = 'lowOff'
	setTimeout(function() {
		setLights(lights, off)
		_lightState = 'off'
		ignoreMotion = false
	}, 10000)
}

const setLights = function(lights, lightState) {
	lights.forEach(function(light) {
		api.setLightState(light.id, lightState)
	})
}

const isDaytime = function() {
	let h = moment().hour()
	return (h > 7 && h < 17)
}

const loop = function() {
	particle.getMotion()
		.then(function(reply) {
			if (reply.return_value === 1) {
				onMotion()
			} 
			return particle.getButton()
		}).then(function(buttonState) {
			if (buttonState.return_value === 1) {
				// one press button
				userOff()
			}
			if (buttonState.return_value === 2) {
				// double press button
				userOn()
			}
			setTimeout(loop, 1000)
		}).catch(function(err) {
			debug(`Caught error: ${err}`)
			setTimeout(loop, 10000)
		})
}

const main = function() {
	if (process.argv.length < 3) {
		usage()
		process.exit(0)
	}

	debug(`starting`)
	lights = lightName.lightsFromNamesOrExit(process.argv.slice(2))
	setLights(lights, off)
	loop()
}

const usage = function() {
	debug("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...")
	debug("Each LIGHTNAME is the name of a light defined in constants.js:")
	var lightNames = _.pluck(constants.lights, 'name').join(", ")
	debug('"' + lightNames + '"')
}

main()


