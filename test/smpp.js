var assert = require('assert'),
    fs = require('fs'),
    smpp = require('..');

describe('Server', function() {
	var server;

	before(function() {
		server = smpp.createServer();
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

describe('Session', function() {
	var server, port, secure = {};

	before(function(done) {
		server = smpp.createServer();
		server.listen(0, done);
		port = server.address().port;
	});

	before(function(done) {
		secure.server = smpp.createServer({
			key: fs.readFileSync(__dirname + '/fixtures/server.key'),
			cert: fs.readFileSync(__dirname + '/fixtures/server.crt')
		});
		secure.server.listen(0, done);
		secure.port = secure.server.address().port;
	});

	after(function(done) {
		server.sessions.forEach(function(session) {
			session.close();
		});
		server.close(done);
	});

	after(function(done) {
		secure.server.sessions.forEach(function(session) {
			session.close();
		});
		secure.server.close(done);
	});

	describe('smpp.connect()', function() {
		it('should use 2775 or 3550 as default port', function() {
			var session = smpp.connect();
			assert.equal(session.options.port, 2775);
			var session = smpp.connect({tls: true});
			assert.equal(session.options.port, 3550);
			var session = smpp.connect('smpp://localhost');
			assert.equal(session.options.port, 2775);
			var session = smpp.connect('ssmpp://localhost');
			assert.equal(session.options.port, 3550);
		});

		it('should be backward compatible', function() {
			var session = smpp.connect('127.0.0.1');
			assert.equal(session.options.port, 2775);
			assert.equal(session.options.host, '127.0.0.1');
			var session = smpp.connect('127.0.0.1', 1234);
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');
		});

		it('should properly parse connection url', function() {
			var session = smpp.connect('smpp://127.0.0.1:1234');
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');
			var session = smpp.connect('ssmpp://localhost');
			assert(session.options.tls);
			var session = smpp.connect({ url: 'ssmpp://127.0.0.1:1234'	});
			assert(session.options.tls);
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');
		});

		it('should successfully establish a connection', function(done) {
			var session = smpp.connect({ port: port }, done);
		});

		it('should successfully establish a secure connection', function(done) {
			var session = smpp.connect({
				port: secure.port,
				tls: true,
				rejectUnauthorized: false
			}, done);
		});
	});
});
