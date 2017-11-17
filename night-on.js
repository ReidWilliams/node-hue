// turn lights on during eveningh hours
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
			const _hue = Math.floor(Math.random()*100)
			const bri = Math.floor(Math.random()* 40)
			return lightState.create().on(true).hsb(_hue, 100, 0).transition(60000)
		}
	},

	{
		name: 'front-entryway',
		state: function() {
			return lightState.create().on(true).white(350, 100)
		}
	},

	{
		name: 'front-entryway',
		state: function() {
			return lightState.create().on(true).white(350, 100)
		}
	},

	{
		name: 'front-entryway',
		state: function() {
			return lightState.create().on(true).white(350, 100)
		}
	}
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
	debug(`starting`)
	setLightState()
	setInterval(setLightState, 60000)
}

main()


