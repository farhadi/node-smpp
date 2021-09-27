var assert = require('assert'),
    smpp = require('..'),
	Buffer = require("safer-buffer").Buffer;

describe('ProxyProtocol', function() {
	var server, port, debugBuffer = [], lastServerError;

	// Write fake proxy protocol headers into the socket to test proxy protocol support
	var proxyProtocol = {
		sendFakeHeader: function(socket, headerString) {
			socket.write(Buffer.from("PROXY "+headerString, 'ascii'), function() {});
			return true;
		},
		sendFakeHeaderIPv4: function(socket, ipV4Src, ipV4Dest) {
			if (ipV4Src === undefined) ipV4Src="1.2.3.4";
			if (ipV4Dest === undefined) ipV4Dest="5.6.7.8";
			return proxyProtocol.sendFakeHeader(socket, "TCP4 "+ipV4Src+" "+ipV4Dest+" 2775 2775\r\n");
		},
		sendFakeHeaderIPv6: function(socket, ipV6Src, ipV6Dest) {
			if (ipV6Src === undefined) ipV6Src="2001:db8:3333:4444:5555:6666:7777:8888";
			if (ipV6Dest === undefined) ipV6Dest="2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF";
			return proxyProtocol.sendFakeHeader(socket, "TCP6 "+ipV6Src+" "+ipV6Dest+" 2775 2775\r\n");
		},
		sendFakeHeaderUnknown: function(socket) {
			return proxyProtocol.sendFakeHeader(socket, "UNKNOWN\r\n");
		}
	}

	before(function (done) {
		server = smpp.createServer({
			enable_proxy_protocol_detection: true,
		}, function (session) {
			debugBuffer = [];
			lastServerError = null;
			session.on('pdu', function(pdu) {
				session.send(pdu.response()); // Always reply
			});
			// We'll use the debug event to track what happened inside the server
			session.on('debug', function(type, msg, payload) {
				debugBuffer.push({type: type, msg: msg, payload: payload});
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

	after(function (done) {
		server.sessions.forEach(function (session) {
			session.destroy();
		});
		server.close(done);
	});

	it('should decode an IPv4 proxy protocol header and use it as remoteAddress', function (done) {
		var session = smpp.connect({port: port}, function () {
			var addr = "1.1.2.2";
			proxyProtocol.sendFakeHeaderIPv4(session.socket, addr);
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
			proxyProtocol.sendFakeHeaderIPv6(session.socket, addr);
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
			proxyProtocol.sendFakeHeaderUnknown(session.socket);
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

	it('should fail with a header larger than 108 bytes', function (done) {
		var session = smpp.connect({port: port}, function () {
			proxyProtocol.sendFakeHeader(session.socket, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer a neque at ex gravida feugiat et a erat. Donec mattis vulputate metus, bibendum dapibus felis egestas vitae. Cras suscipit sodales felis sed tincidunt. Fusce mattis rutrum purus pulvinar porta. Ut feugiat sed turpis nec consectetur. Etiam imperdiet a libero in vulputate. Mauris feugiat arcu ex, et sollicitudin orci laoreet non. Phasellus consequat erat sit amet felis ullamcorper consequat.");
			session.enquire_link(function (pdu) {});
			session.on("close", function() {
				assert.equal(lastServerError.code, "PROXY_PROTOCOL_HEADER_TOO_LARGE");
				done();
			});
		});
	});

});
