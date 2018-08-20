// Current version turns on office light when there's motion
// this code has an adaptive algorithm that extends the time the
// light is on the more often it is turned on.

const hue = require("node-hue-api")
const moment = require("moment")
const _ = require('underscore')
const assert = require('assert')

const constants = require('./constants')
const particle = require('./lib/Particle')
const huelib = require('./lib/Hue')
const lightName = require('./lib/LightName')

const lightState = hue.lightState
const api = new hue.HueApi(constants.ip, constants.username)
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

// syntactic sugar to get current controller
const currentController = function() {
	return controllerQueue[0]
}

// loops for lifetime of this program
const controllerQueueLoop = function() {
	if (controllerQueue.length === 0) {
		// No controller, so queue up default
		controllerQueue.push(controllers.defaultController)
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

/* Controls turning lights on and keeping on in response to motion. 
Controller fades lights up, then keeps on for a time, then
fades off.
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

// Turn lights off immediately in response to user in put
class LightsOffController {
	run() {
		debug('LightsOffController running')
	}

	interrupt() {
		debug('LightsOffController interrupted')
	}
}

/* Holds single instances of each controller type. Design pattern
each controller class has a single instance that is never destroyed,
instead run and interrupted as needed.
*/
const controllers = {
	defaultController: 			 new DefaultController()
	bootLightsOffController: new BootLightsOffController()
	lightsOnController:      new LightsOnController()
	lightsOffController:     new LightsOffController()
}

// contains logic of how to map a set of recent events
// to correct controller
const processEvents = function() {
	if (noEvents()) {
		return
	}

	// Never interrupt LightsOffController or BootLightsOff
	// controllers and no need to deliver any messages
	if ((currentController() instanceof LightsOffController)
		|| currentController() instanceof BootLightsOffController
	) {
		return
	}

	assert((
		currentController() 	 instanceof DefaultController
		|| currentController() instanceof LightsOnController
		), 'Unrecognized controller in processEvents'

	// lightsOff event interrupts everything (except LightsOffController)
	if (eventState.buttonState === buttonState.lightsOff) {
		controllerQueue.push(controllers.lightsOffController)
		currentController().interrupt()
		return
	}

	if (eventState.buttonState === buttonState.lightsStayOn) {
		// either queue up LightsOnController or let it know that
		// event came in
		if (currentController() instanceof LightsOnController) {
			currentController().userRequestKeepLightsOn()
		} else {
			// controller is default
			controllerQueue.push(controllers.lightsOnController)
			currentController().interrupt()
		}

		return
	}

	if (eventState.motionSensed === true) {
		if (currentController() instanceof LightsOnController) {
			currentController().motionSensed()
		}

		if (currentController() instanceof DefaultController) {
			controllerQueue.push(controllers.lightsOnController)
			currentController().interrupt()
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
	controllerQueue.push(controllers.bootLightsOffController)
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




