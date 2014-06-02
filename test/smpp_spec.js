var smpp   = require("../lib/smpp");
var promises = require("./helpers/promises");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _        = require("lodash");

describe("A Session sends pdu and doesn't receive responce", function() {
	var server;
	var session;
	var response
	var clock;

	before(function (done) {
		clock = sinon.useFakeTimers();
		server = smpp.createServer(function (session) {
			session.on('bind_transceiver', function () {});
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
		clock.restore();
		session.close();
		promises.events(session, "close")
		.then(function () {
			server.close();
			return promises.events(server, "close");
		})
		.nodeify(done);
	});

	it("throws error when it didn't receive response", function () {
		var callback = function(pdu) {
			throw new Error("Call callback without response");
		}

		var send = function () {
			session.bind_transceiver({ system_id: 'test' }, callback);
			clock.tick(session.responseTimeout);
		};

		expect(send, "no error").to.throw(Error, /Timed out waiting for response/)
	});

	it("removes object from _callback", function () {
		expect(_.some(session._callbacks, _.isObject), "object still in the array for callbacks").to.be.false;
	})
});