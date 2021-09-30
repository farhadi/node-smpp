var assert = require('assert'),
	net = require('net'),
	tls = require('tls'),
	fs = require('fs'),
    smpp = require('..'),
	PDU = require('../lib/pdu').PDU,
	Buffer = require("safer-buffer").Buffer;

describe('ProxyProtocol', function() {
	var server, port,
		secureServer, securePort,
		debugBuffer = [],
		lastServerError;

	var listener = function (session) {
		session.on('pdu', function(pdu) {
			session.send(pdu.response()); // Always reply
		});
		// Errors
		session.on('error', function (err) {
			lastServerError = err;
			session.close();
		});
	};

	var debugListener = function(type, msg, payload) {
		debugBuffer.push({type: type, msg: msg, payload: payload});
	};

	beforeEach(function (done) {
		debugBuffer = [];
		lastServerError = null;
		server = smpp.createServer({
			enable_proxy_protocol_detection: true, // Will create a proxied server (provided by findhit-proxywrap module)
			debugListener: debugListener,
		}, listener);
		server.listen(0, done);
		port = server.address().port;
	});

	beforeEach(function (done) {
		debugBuffer = [];
		lastServerError = null;
		secureServer = smpp.createServer({
			enable_proxy_protocol_detection: true, // Will create a proxied server (provided by findhit-proxywrap module)
			debugListener: debugListener,
			requestCert: false,
			key: fs.readFileSync(__dirname + '/fixtures/server.key'),
			cert: fs.readFileSync(__dirname + '/fixtures/server.crt')
		}, listener);
		secureServer.listen(0, done);
		securePort = secureServer.address().port;
	});

	afterEach(function (done) {
		server.sessions.forEach(function (session) {
			session.close();
		});
		server.close();

		secureServer.sessions.forEach(function (session) {
			session.close();
		});
		secureServer.close();

		done();
	});

	it('should decode an IPv4 proxy protocol header and use it as remoteAddress (NON-TLS)', function (done) {
		var socket = net.connect( {port: port} );
		var addr = "1.1.4.4";
		var proxyAddr = "2.2.3.3";
		server.options.autoPrependBuffer = Buffer.from("PROXY TCP4 "+addr+" "+proxyAddr+" 5566 7788\r\n");
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer());
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.remoteAddress, addr);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy.address, proxyAddr);
				socket.destroy();
			});
			socket.on("close", function() {
				done();
			});
		});
	});

	it('should decode an IPv4 proxy protocol header and use it as remoteAddress (TLS)', function (done) {
		var socket = tls.connect( {port: securePort, rejectUnauthorized: false} );
		var addr = "1.1.4.4";
		var proxyAddr = "2.2.3.3";
		secureServer.options.autoPrependBuffer = Buffer.from("PROXY TCP4 "+addr+" "+proxyAddr+" 5566 7788\r\n");
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer());
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.remoteAddress, addr);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy.address, proxyAddr);
				socket.destroy();
			});
			socket.on("close", function() {
				done();
			});
		});
	});

	it('should bypass proxy-protocol if no proxy protocol header is sent (NON-TLS)', function (done) {
		var socket = net.connect( {port: port} );
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy, false);
				socket.destroy();
				done();
			});
		});
	});

	it('should bypass proxy-protocol if no proxy protocol header is sent (TLS)', function (done) {
		var socket = tls.connect( {port: securePort, rejectUnauthorized: false} );
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy, false);
				socket.destroy();
				done();
			});
		});
	});

	it('should decode an IPv6 proxy protocol header and use it as remoteAddress (NON-TLS)', function (done) {
		var addr = "2001:db8:6666:7777:8888:3333:4444:5555";
		var proxyAddr = "2001:db8:3333:4444:5555:6666:7777:8888";
		server.options.autoPrependBuffer = Buffer.from("PROXY TCP6 "+addr+" "+proxyAddr+" 5566 7788\r\n");
		var socket = net.connect( {port: port} );
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.remoteAddress, addr);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy.address, proxyAddr);
				socket.destroy();
				done();
			})
		});
	});

	it('should decode an IPv6 proxy protocol header and use it as remoteAddress (TLS)', function (done) {
		var socket = tls.connect( {port: securePort, rejectUnauthorized: false} );
		var addr = "2001:db8:6666:7777:8888:3333:4444:5555";
		var proxyAddr = "2001:db8:3333:4444:5555:6666:7777:8888";
		secureServer.options.autoPrependBuffer = Buffer.from("PROXY TCP6 "+addr+" "+proxyAddr+" 5566 7788\r\n");
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
			socket.on("readable", function() {
				// Enquire received, don't need to check it, just check the server decoded the proxy protocol
				assert.equal(debugBuffer[0].type, "client.connected");
				assert.equal(debugBuffer[0].payload.proxiedServer, true);
				assert.equal(debugBuffer[0].payload.proxiedConnection, true);
				assert.equal(debugBuffer[0].payload.remoteAddress, addr);
				assert.equal(debugBuffer[0].payload.proxyProtocolProxy.address, proxyAddr);
				socket.destroy();
				done();
			})
		});
	});

	it('should fail with a PROXY header too long (NON-TLS)', function (done) {
		var socket = net.connect( {port: port} );
		server.on("error", function(e) {
			assert.equal(e.message, "PROXY header too long");
			done();
		});
		server.options.autoPrependBuffer = Buffer.from("PROXY Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer a neque at ex gravida feugiat et a erat. Donec mattis vulputate metus, bibendum dapibus felis egestas vitae. Cras suscipit sodales felis sed tincidunt. Fusce mattis rutrum purus pulvinar porta. Ut feugiat sed turpis nec consectetur. Etiam imperdiet a libero in vulputate. Mauris feugiat arcu ex, et sollicitudin orci laoreet non. Phasellus consequat erat sit amet felis ullamcorper consequat.");
		socket.on("error", function(e) {});
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
		});
	});

	it('should fail with a PROXY header too long (TLS)', function (done) {
		var socket = tls.connect( {port: securePort, rejectUnauthorized: false} );
		secureServer.on("error", function(e) {
			assert.equal(e.message, "PROXY header too long");
			done();
		});
		secureServer.options.autoPrependBuffer = Buffer.from("PROXY Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer a neque at ex gravida feugiat et a erat. Donec mattis vulputate metus, bibendum dapibus felis egestas vitae. Cras suscipit sodales felis sed tincidunt. Fusce mattis rutrum purus pulvinar porta. Ut feugiat sed turpis nec consectetur. Etiam imperdiet a libero in vulputate. Mauris feugiat arcu ex, et sollicitudin orci laoreet non. Phasellus consequat erat sit amet felis ullamcorper consequat.");
		socket.on("error", function(e) {
			/* Required to capture socket errors, the TLS socket will throw an error because it's unable to do the handshake */
		});
		socket.on("connect", function() {
			socket.write(new PDU("enquire_link", {}).toBuffer()); // Send a demo enquire just get a reply from the server
		});
	});

});
