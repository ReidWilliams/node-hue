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

const lightIntervals = [10, 20, 60, 5*60, 10*60, 15*60] // seconds
let lightIntervalIndex = 0

let senseTimerHandle = null
let lightTimerHandle = null
let motionSticky = false

// called whenever motion is seen
const onMotion = function() {
	console.log(`saw motion`)
	console.log(`setting light timer to ${getLightInterval()} seconds`)
	motionSticky = true
	turnLightsOn()
	clearTimeout(lightTimerHandle)
	lightTimerHandle = setTimeout(turnLightsOff, getLightInterval() * 1000)

	// set a timer that determines next time to see if there's been motion
	// set twice as long as light is on, so that user can wave to turn light on
	// when it goes off, and process is still sensing
	if (!senseTimerHandle) {
		console.log(`setting sense timer to ${getLightInterval() *2} seconds`)
		senseTimerHandle = setTimeout(senseTimerExpired, getLightInterval() * 2 * 1000)
	}
}

const senseTimerExpired = function() {
	console.log(`sense timer expired`)
	senseTimerHandle = null
	if (motionSticky) {
		console.log(`there was motion during sense period`)
		motionSticky = false
		increaseLightInterval()
		// set timer again and wait another sense interval
		console.log(`setting sense timer for ${getLightInterval() * 2} seconds`)
		senseTimerHandle = setTimeout(senseTimerExpired, getLightInterval() * 2 * 1000)
	} else {
		// no motion in last sense interval
		// set sense interval back to default and turn lights off
		resetLightInterval()
		console.log(`no motion in sense interval, light interval is now ${getLightInterval()} seconds`)
	}
}

const getLightInterval = function() {
	return lightIntervals[lightIntervalIndex]
}

const increaseLightInterval = function() {
	lightIntervalIndex = Math.min(lightIntervalIndex + 1, lightIntervals.length)
}

const resetLightInterval = function() {
	lightIntervalIndex = 0
}

// turn light to low on then fade to on. Turn light to low off, then fade to off
var lights = null // set by main from argv
const lowOn = lightState.create().on(true).hsb(100, 30, 0)
const on = lightState.create().on(true).white(325, 100	).transition(3000)
const lowOff = lightState.create().on(true).hsb(250, 100, 0).transition(10000)
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
		console.log(`turning lights off`)
		clearTimeout(lightTimer)
		setLights(lights, lowOff)
		_lightState = 'lowOff'
		lightTimer = setTimeout(function() {
			setLights(lights, off)
			_lightState = 'off'
		}, 10000)
	} 
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

const main = function() {
	if (process.argv.length < 3) {
		usage()
		process.exit(0)
	}

	console.log(`starting`)
	lights = lightName.lightsFromNamesOrExit(process.argv.slice(2))
	setLights(lights, off)

	let particleCallInProgress = false
	setInterval(function() {
		if (!particleCallInProgress) {
			particleCallInProgress = true
			particle.getMotion()
			.then(function(reply) {
				particleCallInProgress = false
				if (reply.return_value !== 0) {
					onMotion()
				}
			})
			.catch(function(err) {
				console.log(`Caught error: ${err}`)
				particleCallInProgress = false
			})
		} else {
			console.log(`particleCallInProgress is true`)
		}
	}, 1000)
}

const usage = function() {
	console.log("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...")
	console.log("Each LIGHTNAME is the name of a light defined in constants.js:")
	var lightNames = _.pluck(constants.lights, 'name').join(", ")
	console.log('"' + lightNames + '"')
}

main()


