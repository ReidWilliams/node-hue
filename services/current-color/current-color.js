var CurrentColor = function ( options ) {

	this.add({role: 'color', cmd: 'get-current'}, function (msg, respond) {
		var response = { colortemp: 200, brightness: 100 };
		respond(null, response);
	});

	this.add({role: 'color', cmd: 'set-current'}, function(msg, response) {
		response(null, 'ok');
	});

};

var seneca = require( 'seneca' )().use(CurrentColor).listen();