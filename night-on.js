// turn lights on during evening hours
// flicker lights

const hue = require("node-hue-api")
const moment = require("moment")
const constants = require('./constants')
const api = new hue.HueApi(constants.ip, constants.username)
const _ = require('underscore')
const lightState = hue.lightState
const lightName = require('./lib/LightName')

const debug = function(m) { console.log(`${moment().format('MMM DD hh:mm:ss')}     ${m}`) }

const lights = [
	{
		name: 'living-room-shelf',
		state: function() {
			let brightness = 0
			// red - yellow, purple - red
			// Random
			// let hue = Math.floor((Math.random()*169 + 260) % 359)

			// hue from time
			let hue = hueFromTime()
			console.log(`setting hue to ${hue}`)

			// occasionally set hue to bright pink
			if (Math.random() < (1/500)) {
				hue = 340
				brightness = 100
			}

			return lightState.create().on(true).hsb(hue, 100, brightness).transition(60000)
		}
	},

	// {
	// 	name: 'front-entryway',
	// 	state: function() {
	// 		return lightState.create().on(true).white(350, 100)
	// 	}
	// },
]

const off = lightState.create().on(false)

const turnLightsOn = function() {
	_.each(lights, light => {
		setLights([light.name], light.state())
	})	
}

const turnLightsOff = function() {
	_.each(lights, light => {
		setLights([light.name], off)
	})
}

const setLights = function(lights, lightState) {
	lights.forEach(function(light) {
		const lightObject = lightName.lightNamed(light)
		api.setLightState(lightObject.id, lightState)
	})
}

const onTime = function() {
	let h = moment().hour()
	return (h >= 17 && h <= 22)
}

const setLightState = function() {
	if (onTime()) {
		turnLightsOn()
	} else {
		turnLightsOff()
	}
}

const minsDiff = (start, end) => {
	return end >= start ? end - start : (1440 - start) + end
}

const hueFromTime = () => {
	const start = 17*60 // start at 5pm
	const now = moment().hour()*60 + moment().minute()
	const end = 23*60 // end at 10pm

	const diffToNow = minsDiff(start, now)
	const diffToEnd = minsDiff(start, end)
	const ratio = 1 - (diffToNow / diffToEnd)
	// Ratio is 1 at start, 0 at end

	// Range from 70 (yellow) to 260 (blue)
	return Math.floor((260 + 169*ratio) % 359)
}

const main = function() {
	debug(`starting`)
	setLightState()
	setInterval(setLightState, 60000)
}

main()


