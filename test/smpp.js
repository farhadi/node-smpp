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
			server.listen(6789, done);
		});

		afterEach(function (done) {
			server.once('close', done);
			server.close();
		});

		it('should bind to a custom port', function() {
			assert.ok(server.address().port === 6789, 'Invalid custom port');
		});

	});

	describe('#listenRandomPort()', function() {
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
		});
	});

});

describe('Session', function() {
	var server, port, secure = {}, autoresponder = {};

	var sessionHandler = function(session) {
		session.on('enquire_link', function(pdu) {
			session.send(pdu.response());
		});
		session.on('submit_sm', function(pdu) {
			var response = pdu.response();
			response.message_id = "123456789 sent to " + pdu.destination_addr; // Injected to verify the data received by the server
			session.send(response);
		});
	};

	var sessionHandlerAutoresponder = function(session) {
		session.on('pdu', function(pdu) {
			session.send(pdu.response()); // Always reply
		});
	};

	beforeEach(function(done) {
		server = smpp.createServer({}, sessionHandler);
		server.listen(0, done);
		port = server.address().port;
	});

	beforeEach(function(done) {
		autoresponder.server = smpp.createServer({}, sessionHandlerAutoresponder);
		autoresponder.server.listen(0, done);
		autoresponder.port = autoresponder.server.address().port;
	});

	beforeEach(function(done) {
		secure.server = smpp.createServer({
			key: fs.readFileSync(__dirname + '/fixtures/server.key'),
			cert: fs.readFileSync(__dirname + '/fixtures/server.crt')
		}, sessionHandler);
		secure.server.listen(0, done);
		secure.port = secure.server.address().port;
	});

	afterEach(function(done) {
		server.sessions.forEach(function(session) {
			session.close();
		});
		server.close(done);
	});

	afterEach(function(done) {
		autoresponder.server.sessions.forEach(function(session) {
			session.close();
		});
		autoresponder.server.close(done);
	});

	afterEach(function(done) {
		secure.server.sessions.forEach(function(session) {
			session.close();
		});
		secure.server.close(done);
	});

	describe('smpp.connect()', function() {
		it('should use 2775 or 3550 as default port', function() {
			var session = smpp.connect();
			session.on('error', function() {});
			assert.equal(session.options.port, 2775);

			session = smpp.connect({tls: true});
			session.on('error', function() {});
			assert.equal(session.options.port, 3550);

			session = smpp.connect('smpp://localhost');
			session.on('error', function() {});
			assert.equal(session.options.port, 2775);

			session = smpp.connect('ssmpp://localhost');
			session.on('error', function() {});
			assert.equal(session.options.port, 3550);
		});

		it('should be backward compatible', function() {
			var session = smpp.connect('127.0.0.1');
			session.on('error', function() {});
			assert.equal(session.options.port, 2775);
			assert.equal(session.options.host, '127.0.0.1');

			session = smpp.connect('127.0.0.1', 1234);
			session.on('error', function() {});
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');
		});

		it('should properly parse connection url', function() {
			var session = smpp.connect('smpp://127.0.0.1:1234');
			session.on('error', function() {});
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');

			session = smpp.connect('ssmpp://localhost');
			session.on('error', function() {});
			assert(session.options.tls);

			session = smpp.connect({ url: 'ssmpp://127.0.0.1:1234'});
			session.on('error', function() {});
			assert(session.options.tls);
			assert.equal(session.options.port, 1234);
			assert.equal(session.options.host, '127.0.0.1');
		});

		it('should successfully establish a connection', function(done) {
			smpp.connect({ port: port }, function() {
				done();
			});
		});

		it('should successfully establish a secure connection', function(done) {
			smpp.connect({
				port: secure.port,
				tls: true,
				rejectUnauthorized: false
			}, function() {
				done();
			});
		});

		it('should successfully connect by instantiating a Session directly, skipping the smpp.connect() factory', function(done) {
			// There are some clients using this approach.
			// This should be deprecated in the future to make sure every client connection goes through the factory method.
			var session = new smpp.Session({
				host: "127.0.0.1",
				port: port
			});
			session.on("connect", done);
		});
	});

	describe('#send()', function() {
		it('should successfully send a pdu', function(done) {
			var session = smpp.connect({ port: port }, function() {
				var pdu = new smpp.PDU('enquire_link');
				session.send(pdu, done.bind(this, null));
			});
		});

		it('should successfully send a pdu using shorthand methods', function(done) {
			var session = smpp.connect({ port: port, auto_enquire_link_period:10000 }, function() {
				session.enquire_link(done.bind(this, null));
			});
		});

		it('should successfully send a pdu on a secure connection', function(done) {
			var session = smpp.connect({
				port: secure.port,
				tls: true,
				rejectUnauthorized: false
			}, function() {
				session.enquire_link(done.bind(this, null));
			});
		});

		it('should successfully send a pdu and receive its response', function(done) {
			var session = smpp.connect({ port: port }, function() {
				session.submit_sm({
					destination_addr: "+01123456789",
					short_message: "Hello!"
				}, function(pdu) {
					assert.equal(pdu.command, "submit_sm_resp");
					assert.equal(pdu.command_status, smpp.ESME_ROK);
					assert.equal(pdu.message_id, "123456789 sent to +01123456789");
					done();
				});
			});
		});

		it('should successfully receive matching responses for any pdu sent with a generic autoreply server handler', function(done) {
			var session = smpp.connect({ port: autoresponder.port}, function() {
				session.bind_transceiver({}, function(pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					session.bind_receiver({}, function(pdu) {
						assert.equal(pdu.command, "bind_receiver_resp");
						session.bind_transmitter({}, function(pdu) {
							assert.equal(pdu.command, "bind_transmitter_resp");
							done();
						});
					});
				});
			});
		});

		it('should receive failure callback', function(done) {
			var session = smpp.connect({ port: autoresponder.port}, function() {
				session.bind_transceiver({}, function(pdu) {
					session.socket.writable = false;
					session.submit_sm(new smpp.PDU('submit_sm'), function(pdu) {
						throw Error('There should not be response');
					},
					function(pdu) {
						throw Error('There should not be request call');
					},
					function(pdu) {
						assert.equal(pdu.command, 'submit_sm');
						assert.equal(pdu.command_status, smpp.ESME_RSUBMITFAIL);
						done();
					});
				});
			});
		});
	});

});

describe('Client/Server simulations', function() {

	describe('standard connection simulations', function() {
		var server, port, secure = {}, debugBuffer = [], lastServerError;

		beforeEach(function (done) {
			var sessionHandler = function (session) {
				debugBuffer = [];
				// We'll use the debug event to track what happened inside the server
				session.on('debug', function(type, msg, payload) {
					debugBuffer.push({type: type, msg: msg, payload: payload});
				});
				session.on('submit_sm', function (pdu) {
					var response = pdu.response();
					response.message_id = "123456789 sent to " + pdu.destination_addr; // Injected to verify the data received by the server
					session.send(response);
				});
				session.on('bind_transceiver', function (pdu) {
					// pause the session to prevent further incoming pdu events,
					// untill we authorize the session with some async operation.
					session.pause();
					var checkAsyncUserPass = function (user, pwd, onComplete) {
						setTimeout(function () {
							if (user === "FAKE_USER" && pwd === "FAKE_PASSWORD") {
								onComplete();
							} else {
								onComplete("invalid user and password combination");
							}
						}, 25); // Delayed processing simulation
					};
					checkAsyncUserPass(pdu.system_id, pdu.password, function (err) {
						if (err) {
							session.send(pdu.response({ command_status: smpp.ESME_RBINDFAIL}));
							session.close();
						} else {
							session.send(pdu.response());
							session.resume();
						}
					});
				});
				// Errors
				session.on('error', function (err) {
					lastServerError = err;
					session.close();
				});
			}
			server = smpp.createServer({}, sessionHandler);
			server.listen(0);
			port = server.address().port;

			secure.server = smpp.createServer({
				key: fs.readFileSync(__dirname + '/fixtures/server.key'),
				cert: fs.readFileSync(__dirname + '/fixtures/server.crt')
			}, sessionHandler);
			secure.server.listen(0, done);
			secure.port = secure.server.address().port;
		});

		afterEach(function (done) {
			server.sessions.forEach(function (session) {
				session.close();
			});
			server.close();

			secure.server.sessions.forEach(function (session) {
				session.close();
			});
			secure.server.close(done);
		});

		it('should successfully bind a transceiver with a hardcoded user/password', function (done) {
			var session = smpp.connect({port: port}, function () {
				session.bind_transceiver({
					system_id: 'FAKE_USER',
					password: 'FAKE_PASSWORD'
				}, function (pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					assert.equal(pdu.command_status, smpp.ESME_ROK);
					// send fake message
					session.submit_sm({
						destination_addr: "+01123456789",
						short_message: "Hello!"
					}, function (pdu) {
						assert.equal(pdu.command, "submit_sm_resp");
						assert.equal(pdu.command_status, smpp.ESME_ROK);
						assert.equal(pdu.message_id, "123456789 sent to +01123456789");
						done();
					});
				});
			});
		});

		it('should fail to bind a transceiver with a wrong hardcoded user/password', function (done) {
			var session = smpp.connect({port: port}, function () {
				session.bind_transceiver({
					system_id: 'FAKE_USER_INVALID',
					password: 'FAKE_PASSWORD_INVALID'
				}, function (pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					assert.equal(pdu.command_status, smpp.ESME_RBINDFAIL);
					done();
				});
			});
		});

		it('should successfully emit every expected debug log entry', function (done) {
			var session = smpp.connect({port: port}, function () {
				session.bind_transceiver({
					system_id: 'FAKE_USER',
					password: 'FAKE_PASSWORD'
				}, function (pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					assert.equal(pdu.command_status, smpp.ESME_ROK);

					// Read the server debug entries to find the relevant types that should have been emitted.
					var debugEntry, i;

					assert.notEqual(debugBuffer.length, 0, "Debug log is empty");

					for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "pdu.command.in") debugEntry = debugBuffer[i];
					assert.notEqual(debugEntry, null, "pdu.command.in entry not found in debug log");
					assert.equal(debugEntry ? debugEntry.msg : null, "bind_transceiver", "bind_transceiver command not found in log");

					for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "pdu.command.out") debugEntry = debugBuffer[i];
					assert.notEqual(debugEntry, null, "pdu.command.out entry not found in debug log");
					assert.equal(debugEntry ? debugEntry.msg : null, "bind_transceiver_resp", "bind_transceiver_resp command not found in log");

					done();
				});
			});
		});

		it('should fail to connect with an invalid port and trigger a ECONNREFUSED error', function (done) {
			var session = smpp.connect({port: 27750}, function () {});
			session.on('error', function (e) {
				// empty callback to catch emitted errors to prevent exit due unhandled errors
				assert.equal(e.code, "ECONNREFUSED");
				done();
			});
		});

		it('should fail to connect with an invalid host and trigger a EAI_AGAIN, ENOTFOUND or ESRCH error', function (done) {
			var session = smpp.connect({url: 'smpp://unknownhost:2775'});
			session.on('error', function (e) {
				// empty callback to catch emitted errors to prevent exit due unhandled errors
				assert.notEqual(-1, ["EAI_AGAIN", "ENOTFOUND", "ESRCH"].indexOf(e.code));
				done();
			});
		});

		it('should fail to connect with an invalid host and trigger a ETIMEOUT error', function (done) {
			var session = smpp.connect({url: 'smpp://1.1.1.1:2775', connectTimeout: 25});
			session.on('error', function (e) {
				// empty callback to catch emitted errors to prevent exit due unhandled errors
				assert.equal(e.code, "ETIMEOUT");
				done();
			});
		});

		it('should successfully emit every expected metric', function (done) {
			var clientMetricsEmitted = [], serverMetricsEmitted = [], metricsEntry = null;
			var session = smpp.connect({
				port: secure.port,
				tls: true,
				rejectUnauthorized: false
			}, function () {
				session.bind_transceiver({
					system_id: 'FAKE_USER',
					password: 'FAKE_PASSWORD'
				}, function (pdu) {
					session.close(function() {
						// Check client metrics
						for (i = 0, metricsEntry = null; i < clientMetricsEmitted.length && metricsEntry === null; i++) if (clientMetricsEmitted[i].event === "server.connected") metricsEntry = clientMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "server.connected entry not found in metrics");
						for (i = 0, metricsEntry = null; i < clientMetricsEmitted.length && metricsEntry === null; i++) if (clientMetricsEmitted[i].event === "pdu.command.out") metricsEntry = clientMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "pdu.command.out entry not found in metrics");
						for (i = 0, metricsEntry = null; i < clientMetricsEmitted.length && metricsEntry === null; i++) if (clientMetricsEmitted[i].event === "pdu.command.in") metricsEntry = clientMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "pdu.command.in entry not found in metrics");
						for (i = 0, metricsEntry = null; i < clientMetricsEmitted.length && metricsEntry === null; i++) if (clientMetricsEmitted[i].event === "server.disconnected") metricsEntry = clientMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "server.disconnected entry not found in metrics");
						// Check server metrics
						for (i = 0, metricsEntry = null; i < serverMetricsEmitted.length && metricsEntry === null; i++) if (serverMetricsEmitted[i].event === "client.connected") metricsEntry = serverMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "client.connected entry not found in metrics");
						for (i = 0, metricsEntry = null; i < serverMetricsEmitted.length && metricsEntry === null; i++) if (serverMetricsEmitted[i].event === "pdu.command.out") metricsEntry = serverMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "pdu.command.out entry not found in metrics");
						for (i = 0, metricsEntry = null; i < serverMetricsEmitted.length && metricsEntry === null; i++) if (serverMetricsEmitted[i].event === "pdu.command.in") metricsEntry = serverMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "pdu.command.in entry not found in metrics");
						for (i = 0, metricsEntry = null; i < serverMetricsEmitted.length && metricsEntry === null; i++) if (serverMetricsEmitted[i].event === "client.disconnected") metricsEntry = serverMetricsEmitted[i];
						assert.notEqual(metricsEntry.event, null, "client.disconnected entry not found in metrics");
						done();
					})
				});
			});
			// Add metrics loggers
			session.on("metrics", function(event, value, payload, context) {
				clientMetricsEmitted.push({event: event, value: value, payload: payload});
			});
			secure.server.on("session", function(serverSession) {
				serverSession.on("metrics", function(event, value, payload, context) {
					serverMetricsEmitted.push({event: event, value: value, payload: payload});
				})
			});
		});
	});


	describe('heavy load simulations', function() {

		var server, port, lastServerError;

		beforeEach(function (done) {
			server = smpp.createServer({}, function (session) {
				session.on('bind_transceiver', function (pdu) {
					session.pause();
					setTimeout(function () {
						session.resume();
						session.send(pdu.response());
					}, 25); // Delayed processing simulation
				});
				// Errors
				session.on('error', function (err) {
					lastServerError = err;
					session.close();
				});
			});
			server.listen(0, done);
			port = server.address().port;
		});

		afterEach(function (done) {
			server.sessions.forEach(function (session) {
				session.close();
			});
			server.close(done);
		});

		it('should successfully have multiple sessions opened at the same time, closing them all afterwards', function (done) {
			var totalConnections = 100;
			var closedConnections = 0;
			for (var i = 0; i < totalConnections; i++) {
				smpp.connect({port: port}, function (session) {
					session.bind_transceiver({}, function (pdu) {
						assert.equal(pdu.command, "bind_transceiver_resp");
						session.close(function () {
							closedConnections++;
						});
					});
				});
			}
			var interval = setInterval( function() {
				var openConnections = 0;
				server.sessions.forEach(function (session) {
					if (!session.closed) openConnections++;
				});
				// Check if all sessions have been closed
				if (openConnections === 0 && closedConnections === totalConnections && server.sessions.length === 0) {
					clearInterval(interval);
					done(); // Test ok
				}
			}, 10);
		});
	});
});
