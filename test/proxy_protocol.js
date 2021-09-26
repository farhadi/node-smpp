var assert = require('assert'),
    smpp = require('..');

describe('ProxyProtocol', function() {
	var server, port, debugBuffer = [];

	before(function (done) {
		server = smpp.createServer({
			enable_proxy_protocol_detection: true,
		}, function (session) {
			debugBuffer = [];
			session.on('pdu', function(pdu) {
				session.send(pdu.response()); // Always reply
			});
			// We'll use the debug event to track what happened inside the server
			session.on('debug', function(type, msg, payload) {
				debugBuffer.push({type: type, msg: msg, payload: payload});
			});
		});
		server.listen(0, done);
		port = server.address().port;
	});

	after(function (done) {
		server.sessions.forEach(function (session) {
			session.close();
		});
		server.close(done);
	});

	it('should decode an IPv4 proxy protocol header and use it as remoteAddress', function (done) {
		var session = smpp.connect({port: port}, function () {
			var addr = "1.1.2.2";
			session.sendFakeProxyProtocolHeaderIPv4(addr);
			session.enquire_link(function (pdu) {
				assert.equal(pdu.command, "enquire_link_resp");
				assert.equal(server.sessions[0].remoteAddress, addr);
				// Read the debug entries to find the proxy protocol header address ok notification
				var debugEntry, i;
				for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "proxy_protocol.address.ok") debugEntry = debugBuffer[i];
				assert.notEqual(debugEntry, null, "proxy_protocol.address.ok entry not found in debug log ");
				session.close(done);
			});
		});
	});

	it('should decode an IPv6 proxy protocol header and use it as remoteAddress', function (done) {
		var session = smpp.connect({port: port}, function () {
			var addr = "2001:db8:6666:7777:8888:3333:4444:5555";
			session.sendFakeProxyProtocolHeaderIPv6(addr);
			session.enquire_link(function (pdu) {
				assert.equal(pdu.command, "enquire_link_resp");
				assert.equal(server.sessions[0].remoteAddress, addr);
				// Read the debug entries to find the proxy protocol header address ok notification
				var debugEntry, i;
				for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "proxy_protocol.address.ok") debugEntry = debugBuffer[i];
				assert.notEqual(debugEntry, null, "proxy_protocol.address.ok entry not found in debug log");
				session.close(done);
			});
		});
	});

	it('should decode an UNKNOWN proxy protocol header but ignore it', function (done) {
		var session = smpp.connect({port: port}, function () {
			session.sendFakeProxyProtocolHeaderUnknown();
			session.enquire_link(function (pdu) {
				assert.equal(pdu.command, "enquire_link_resp");
				// Read the debug entries to find the proxy protocol header address ko notification
				var debugEntry, i;
				for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "proxy_protocol.header.decoded") debugEntry = debugBuffer[i];
				assert.notEqual(debugEntry, null, "proxy_protocol.header.decoded entry not found in debug log");

				for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "proxy_protocol.address.ko") debugEntry = debugBuffer[i];
				assert.notEqual(debugEntry, null, "proxy_protocol.address.ko entry not found in debug log");

				session.close(done);
			});
		});
	});

	it('should work even if no proxy protocol header is sent', function (done) {
		var session = smpp.connect({port: port}, function () {
			session.enquire_link(function (pdu) {
				assert.equal(pdu.command, "enquire_link_resp");
				// Read the debug entries to find the proxy protocol header error
				var debugEntry, i;

				for (i = 0, debugEntry = null; i < debugBuffer.length && debugEntry === null; i++) if (debugBuffer[i].type === "proxy_protocol.header.error") debugEntry = debugBuffer[i];
				assert.notEqual(debugEntry, null, "proxy_protocol.header.error entry not found in debug log");

				session.close(done);
			});
		});
	});

});
