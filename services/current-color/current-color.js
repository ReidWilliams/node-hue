var moment = require('moment');

var CurrentColor = function ( options ) {

	this.add({role: 'color', cmd: 'get-current'}, function (msg, respond) {
		this.act({
			role: 'color',
			cmd: 'get-current',
			version: 'daylight-1'
		}, respond);
	});

	this.add({role: 'color', cmd: 'get-current', version: 'daylight-1'}, function (msg, respond) {
		var response = getColorByDaylight();
		respond(null, response);
	});

	this.add({role: 'color', cmd: 'set-current'}, function(msg, response) {
		response(null, 'ok');
	});

	return {
    	name: 'current-color'
  	};
};

// a nice range of colors that goes from the hue's coolest white (154) 
// to warmest white (500) through the day.
var getColorByDaylight = function() {
	var hour = moment().hour() + (moment().minute() / 60);
	
	if (hour < 7) {
		return {
			colortemp: 500, // coolest white
			brightness: 50 	// 50%
		};
	}

	if (hour < 16) {
		return {
			colortemp: 154, // coolest white
			brightness: 50 	// 50%
		};
	}

	if (hour < 19) {
		var colortemp = interpolate(hour, {
			hour1: 16,
			value1: 154,
			hour2: 23,
			value2: 500  
		});
		var brightness = interpolate(hour, {
			hour1: 16,
			value1: 50,
			hour2: 18,
			value2: 100  
		});
		return {colortemp: colortemp, brightness: brightness};
	}

	if (hour < 23) {
		var colortemp = interpolate(hour, {
			hour1: 16,
			value1: 154,
			hour2: 23,
			value2: 500  
		});
		var brightness = 100;
		return {colortemp: colortemp, brightness: brightness};
	}

	return {colortemp: 500, brightness: 100};
}

// evaluate a linear function determined by the given
// hours and colors
var interpolate  = function(hour, options) {
	var slope = (options.value2 - options.value1) / (options.hour2 - options.hour1);
	var intercept = options.value1 - slope * options.hour1;
	return Math.floor((slope * hour + intercept));
}

var seneca = require( 'seneca' )().use(CurrentColor).listen();

// var h = process.argv[2];
// console.log(getColorByDaylight(h));