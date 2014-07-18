var assert = require('assert'),
    Server = require('../lib/smpp').Server;

describe('Server', function() {
	var server;

	before(function() {
		server = new Server();
	});

	describe('#listen()', function() {
		beforeEach(function (done) {
			server.listen(0, done);
		});

		afterEach(function (done) {
			server.once('close', done);
			server.close();
		});

		var port;

		it('should bind to a random port', function() {
			port = server.address().port;
			assert.ok(port > 0, 'Invalid first random port');
		});

		it('should bind to another random port', function() {
			var newPort = server.address().port;
			assert.ok(newPort > 0, 'Invalid second random port');
			assert.notEqual(newPort, port, 'Both random ports are equal!');
		})
	});
});
