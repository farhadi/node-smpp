var smpp     = require("../lib/smpp");
var promises = require("./helpers/promises");
var expect   = require("chai").expect;
var sinon    = require("sinon");

describe("A Session sends pdu and doesn't receive responce", function() {
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

	describe("call callback with error when it didn't receive response", function () {
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

		it("check calling of callback", function () {
			expect(callback.calledOnce, "called callback").to.be.true;
			expect(callback.args[0][0], "without error").to.be.an.instanceOf(Error);
			expect(callback.args[0][0].message, "error message").to.match(/Timed out waiting for response/);
		});
	});

	describe("call callback with pdu when receive response", function () {
		var callback;

		before(function () {
			callback = sinon.spy();
			session.data_sm({}, callback);
		});

		it("check calling of callback", function () {
			expect(callback.calledOnce, "called callback").to.be.true;
			expect(callback.args[0][1], "without pdu").to.exist;
			expect(callback.args[0][1].command, "command of pdu").to.be.equal("data_sm_resp");
		});
	});
});