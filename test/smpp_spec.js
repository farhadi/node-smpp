var expect   = require("chai").expect;
var net      = require("net");
var promises = require("./helpers/promises");
var q        = require("q");
var sinon    = require("sinon");
var smpp     = require("../lib/smpp");

describe("An SMPP session", function () {
	describe("sending a PDU", function() {
		var server;
		var session;

		before(function (done) {
			server = smpp.createServer(function (session) {
				session.on("bind_transceiver", function () {});
				session.on("data_sm", function (pdu) {
					session.send(pdu.response());
				});
			});
			server.listen(2775);
			promises.events(server, "listening")
			.then(function () {
				session = smpp.connect('127.0.0.1', 2775);
				return promises.events(session, "connect");
			})
			.nodeify(done);
		});

		after(function (done) {
			session.close();
			promises.events(session, "close")
			.then(function () {
				server.close();
				return promises.events(server, "close");
			})
			.nodeify(done);
		});

		describe("without a response", function () {
			var clock;
			var callback;

			before(function () {
				clock = sinon.useFakeTimers();
				callback = sinon.spy();
				session.bind_transceiver({ system_id: 'test' }, callback);
				clock.tick(session.responseTimeout);
			});

			after(function () {
				clock.restore();
			});

			it("calls back with a timeout error", function () {
				expect(callback.calledOnce, "called callback").to.be.true;
				expect(callback.args[0][0], "without error").to.be.an.instanceOf(Error);
				expect(callback.args[0][0].message, "error message").to.match(/Timed out waiting for response/);
			});
		});

		describe("receiving a response", function () {
			var callback;

			before(function (done) {
				callback = sinon.spy(done);
				session.data_sm({}, callback);
			});

			it("calls back with the response PDU", function () {
				expect(callback.calledOnce, "called callback").to.be.true;
				expect(callback.args[0][1], "without pdu").to.exist;
				expect(callback.args[0][1].command, "command of pdu").to.be.equal("data_sm_resp");
			});
		});
	});

	describe("receiving a malformed PDU", function () {
		var closedSpy;
		var errorSpy;
		var server;
		var socket;

		before(function (done) {
			var serverSession;

			closeSpy = sinon.spy();
			errorSpy = sinon.spy();

			server = smpp.createServer(function (session) {
				session.once("error", errorSpy);
				session.once("close", closeSpy);
				socket = session.socket;
			});
			server.listen(2775);

			promises.events(server, "listening")
			.then(function () {
				session = net.connect(2775, "127.0.0.1");
				return promises.events(session, "connect");
			})
			.then(function () {
				// Generate a bad PDU packet.
				var badData  = new Buffer(17);
				var received = q.defer();
				var i;

				socket.once("data", received.resolve.bind(received));
				badData.writeUInt32BE(badData.length, 0);
				badData.writeUInt32BE(smpp.commands.enquire_link.id, 4);
				session.write(badData);

				return received.promise;
			})
			.nodeify(done);
		});

		after(function (done) {
			session.end();
			server.close();

			promises.events(server, "close").nodeify(done);
		});

		it("emits an error", function () {
			expect(errorSpy.called, "no error event").to.be.true;
			expect(errorSpy.args[0][0], "error message").to.have.property("message", "Malformed PDU.");
		});

		it("closes the SMPP connection", function () {
			expect(closeSpy.called, "connection was not closed").to.be.true;
		});
	});
});
