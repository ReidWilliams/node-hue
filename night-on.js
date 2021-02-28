// turn lights on during evening hours
// flicker lights

const hue = require("node-hue-api")
const moment = require("moment")
const constants = require('./constants')
const api = new hue.HueApi(constants.ip, constants.username)
const _ = require('underscore')
const lightState = hue.lightState
const lightName = require('./lib/LightName')

const off = lightState.create().on(false)

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

			// occasionally set hue to bright pink
			if (Math.random() < (1/500)) {
				hue = 340
				brightness = 100
			}

			return lightState.create().on(true).hsb(hue, 100, brightness).transition(60000)
		},
		isOn: function(h) {
			return (h >= 17 && h <= 23)
		},
	},

	{
		name: 'front-entryway',
		state: function() {
			let brightness = 100
			let hue = hueFromTime()

			// occasionally set hue to bright pink
			if (Math.random() < (1/500)) {
				hue = 340
				brightness = 100
			}

			return lightState.create().on(true).hsb(hue, 100, brightness).transition(60000)
		},
		isOn: function(h) {
			return (h >= 17 || h <= 7)
		},
	},
]

const setLights = function(lights, lightState) {
	lights.forEach(function(light) {
		const lightObject = lightName.lightNamed(light)
		api.setLightState(lightObject.id, lightState)
	})
}

const setLightState = function() {
	const hour = moment().hour()	

	_.each(lights, light => {
		if (light.isOn(hour)) {
			setLights([light.name], light.state())
		} else {
			setLights([light.name], off)
		}
	})
}

const minsDiff = (start, end) => {
	return end >= start ? end - start : (1440 - start) + end
}

const hueFromTime = () => {
	const start = 17*60 // start at 5pm
	const now = moment().hour()*60 + moment().minute()
	const end = 24*60 // end at midnight

	const diffToNow = minsDiff(start, now)
	const diffToEnd = minsDiff(start, end)
	const ratio = 1 - (diffToNow / diffToEnd)
	// Ratio is 1 at start, 0 at end

	// Range from 70 (yellow) to 260 (blue)
	const hue = Math.floor((260 + 169*ratio) % 359)
	return Math.min(hue, 260)
}

const main = function() {
	debug(`starting`)
	setLightState()
	setInterval(setLightState, 60000)
}

main()


