// turn lights on during eveningh hours

const hue = require("node-hue-api")
const moment = require("moment")
const constants = require('./constants')
const api = new hue.HueApi(constants.ip, constants.username)
const _ = require('underscore')
const lightState = hue.lightState
const lightName = require('./lib/LightName')

const debug = function(m) { console.log(`${moment().format('MMM DD hh:mm:ss')}     ${m}`) }

// light controls
var lights = null // set by main from argv
const on = lightState.create().on(true).hsb(40, 100, 20).transition(3000)
const off = lightState.create().on(false)

const turnLightsOn = function() {
	setLights(lights, on)	
}

const turnLightsOff = function() {
	setLights(lights, off)
}

const setLights = function(lights, lightState) {
	lights.forEach(function(light) {
		api.setLightState(light.id, lightState)
	})
}

const onTime = function() {
	let h = moment().hour()
	debug(h)
	return (h > 18 && h < 23)
}

const setLightState = function() {
	if (onTime()) {
		turnLightsOn()
	} else {
		turnLightsOff()
	}
}

const main = function() {
	if (process.argv.length < 3) {
		usage()
		process.exit(0)
	}

	debug(`starting`)
	lights = lightName.lightsFromNamesOrExit(process.argv.slice(2))
	setLights(lights, off)
	setLightState()
	setInterval(setLightState, 60000)
}

const usage = function() {
	debug("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...")
	debug("Each LIGHTNAME is the name of a light defined in constants.js:")
	var lightNames = _.pluck(constants.lights, 'name').join(", ")
	debug('"' + lightNames + '"')
}

main()


