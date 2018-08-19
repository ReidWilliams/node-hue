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

const debug = function(m) { console.log(`[${moment().format('hh:mm:ss')}] ${m}`) }

// Hue lights to control
let lights = null 

// captures state of inputs, e.g. motion sensor and button
let eventState = null

// possible button press event types
const buttonState = {
	notPressed: 'notPressed',
	lightsOff: 'lightsOff',
	lightsStayOn: 'lightsStayOn'
}

// talk to hue api to set light state for all lights
const setLights = function(lightState) {
	lights.forEach(function(light) {
		api.setLightState(light.id, lightState)
	})
}

// helper to reset eventState to defaults
const resetEventState = function() {
	eventState =  {
		motionSensed: false,
		buttonState: buttonState.notPressed
	}
}

// syntactic sugar: are there any events
// to process 
const noEvents = function() {
	if (eventState.motionSensed === false
		&& buttonState === buttonState.notPressed
	) {
		return true
	} else {
		return false
	}
}

/* queue of controllers that control the lights.
Head of the queue is the currently running controller.
Should only ever be two in queue: current and next.
*/
controllerQueue = []

// loops for lifetime of this program
const controllerQueueLoop = function() {
	if (controllerQueue.length === 0) {
		// No controller, so queue up default
		controllerQueue.push(new DefaultController())
	}

	controllerQueue[0].run().then((returnVal) => {
		// current controller is finished, remove it
		controllerQueue.shift()
		controllerQueueLoop()
	})
}

/* Here, define series of light controllers. These classes
contain code that takes control of lights for a period
of time, typically to fade lights, turn them on or off, 
etc.

All classes contain a run method that returns a promise that
resolves when the controller is finished.

All classes contain an interrupt method that forces the controller
to finish immediately and will cause the run method to resolve
its promise shortly.
*/

// DefaultController does nothing but wait until interrupted
class DefaultController {
	run() {
		debug('DefaultController running')
		return new Promise((resolve, reject) => {
			this.resolve = resolve
		})
	}

	interrupt() {
		debug('DefaultController interrupted')
		if (this.resolve) {
			this.resolve()
		}
	}
}

// Turns lights off immediately
class BootLightsOffController {
	run() {
		const promise = new Promise((resolve, reject) => {
			debug('BootLightsOffController running')
			setLights(lightState.create().on(true).hsb(300, 100, 100))
			setTimeout(() => {
				setLights(lightState.create().on(false))
				debug('BootLightsOffController done')
				resolve()
			}, 2000)
		})
		
		return promise
	}

	interrupt() {
		// Do nothing, this controller can't be interrupted
		debug('BootLightsOffController interrupted')
	}
}

/* Turns lights on for awhile. The sequence goes:
Turn lights from off to a very low on. Fade up for 3 seconds.
Stay on for awhile. Very slowly fade off over course of minutes. 
*/
class LightsOnController {
	constructor() {
		this.states = {
			off: 'off',
			of: 'on',
			fadingOff: 'fadingOff'
		}
		this.secondsOn = 30
		this.fadeOffSeconds = 120
		this.state = this.states.off

		// shorthand for light states
		this.lowOn = lightState.create().on(true).hsb(250, 100, 0)
		this.on = lightState.create().on(true).white(325, 100	).transition(3000)
		this.lowOff = lightState.create().on(true).hsb(250, 100, 0).transition(this.fadeOffSeconds*1000)
		this.off = lightState.create().on(false)
	}

	run() {
		debug('LightsOnController running')
		setLights(this.lowOn)
		setTimeout(() => {
			setLights(this.on)
			this.timer = setTimeout(() => {
				this.fadeOff()
			}, this.secondsOn*1000)
		}, 1000)

		return new Promise((resolve, reject) => {
			this.resolve = resolve
		})
	}

	fadeOff() {
		setLights(this.lowOff)
		setTimeout(() => {
			debug('LightsOnController done')
			setLights(this.off)
			this.resolve()
		}, this.fadeOffSeconds*1000)
	}

	motionSensed() {
		debug('motionSensed, but doing nothing')
	}

	interrupt() {
		debug('LightsOnController interrupted')
		if (this.resolve) {
			this.resolve()
		}
	}
}

// contains logic of how to map a set of recent events
// to correct controller
const processEvents = function() {
	if (noEvents()) {
		return
	}

	if (eventState.buttonState === buttonState.lightsOff) {
		debug('lightsOff')
		return
	}

	if (eventState.buttonState === buttonState.lightsStayOn) {
		debug('lightsStayOn')
		return
	}

	if (eventState.motionSensed === true) {
		if (controllerQueue[0] instanceof LightsOnController) {
			controllerQueue[0].motionSensed()
		}

		if (controllerQueue[0] instanceof DefaultController) {
			controllerQueue.push(new LightsOnController())
			controllerQueue[0].interrupt()
		}

		return
	}
}

const eventLoop = function() {
	processEvents()
	resetEventState()
	particle.getMotion()
		.then(function(reply) {
			if (reply.return_value === 1) {
				eventState.motionSensed = true
			} 
			return particle.getButton()
		}).then(function(buttonState) {
			if (buttonState.return_value === 1) {
				eventState.buttonState = buttonState.lightsOff
				debug('button off')
			}
			if (buttonState.return_value === 2) {
				eventState.buttonState = buttonState.lightsStayOn
				debug('button long')
			}
			setTimeout(eventLoop, 1000)
		}).catch(function(err) {
			debug(`Caught error: ${err}`)
			setTimeout(eventLoop, 10000)
		})
}

const main = function() {
	if (process.argv.length < 3) {
		usage()
		process.exit(0)
	}

	debug(`starting`)
	lights = lightName.lightsFromNamesOrExit(process.argv.slice(2))
	resetEventState()
	controllerQueue.push(new BootLightsOffController())
	controllerQueueLoop()
	eventLoop()
}

const usage = function() {
	debug("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...")
	debug("Each LIGHTNAME is the name of a light defined in constants.js:")
	var lightNames = _.pluck(constants.lights, 'name').join(", ")
	debug('"' + lightNames + '"')
}

main()




