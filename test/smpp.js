var assert = require('assert'),
    Q = require('q'),
    Server = require('../lib/smpp').Server;

suite('Server', function() {
	var server;

	setup(function() {
		server = new Server();
	});

	suite('listen()', function() {
		teardown(function (done) {
			server.close(done);
		});

		test('should bind to a random port', function(done) {
			var port;

			Q.ninvoke(server, 'listen', 0)
			.then(function () {
				port = server.address().port;
				assert.ok(port > 0, 'invalid first port');
				return Q.ninvoke(server, 'close');
			})
			.then(function () {
				return Q.ninvoke(server, 'listen', 0);
			})
			.then(function () {
				var newPort = server.address().port;
				assert.ok(newPort > 0, 'invalid second port');
				assert.notEqual(newPort, port, 'same port');
			})
			.nodeify(done);
		});
	});
});
