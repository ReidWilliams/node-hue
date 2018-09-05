// Current version turns on office light when there's motion
// this code has an adaptive algorithm that extends the time the
// light is on the more often it is turned on.

const hue = require("node-hue-api")
const moment = require("moment")
const _ = require('underscore')
const assert = require('assert')

const constants = require('../constants')
const particle = require('../lib/Particle')
const huelib = require('../lib/Hue')
const lightName = require('../lib/LightName')
const events = require('./events')

const lightState = hue.lightState
const api = new hue.HueApi(constants.ip, constants.username)
const debug = function(m) { console.log(`[${moment().format('hh:mm:ss')}] ${m}`) }



const processEvent = function(event) {
	debug(`queued event ${event}`)
}

process.stdin.setEncoding('utf8')
process.stdin.on('data', function(chunk) {
	chunk = chunk.trim()

  if (chunk === 'm') {
  	processEvent(new events.MotionEvent())
  }

  if (chunk === 'b') {
  	processEvent(new events.ButtonPressEvent())
  }

  if (chunk === 'l') {
  	processEvent(new events.LongButtonPressEvent())
  }
})


const main = function() {
	// if (process.argv.length < 3) {
	// 	usage()
	// 	process.exit(0)
	// }

	debug(`starting`)
	// sensorPollLoop()
}

const usage = function() {
	debug("usage: node " + __filename + " LIGHTNAME LIGHTNAME ...")
	debug("Each LIGHTNAME is the name of a light defined in constants.js:")
	var lightNames = _.pluck(constants.lights, 'name').join(", ")
	debug('"' + lightNames + '"')
}

main()




