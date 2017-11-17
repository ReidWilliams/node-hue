var hue = require("node-hue-api")
var constants = require('./constants')
var api = new hue.HueApi(constants.ip, constants.username)
var _ = require('underscore')

_.each(constants.lights, function(light) {
	api.lightStatus(light.id)
    .then(function(status) {
		console.log(light.name)
		console.log("id:", light.id)
		console.log("on:", status.state.on)
		console.log("")
	})
    .done()
});

