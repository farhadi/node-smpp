var net = require('net'),
	tls = require('tls'),
	util = require('util'),
	parse = require('url').parse,
	defs = require('./defs'),
	PDU = require('./pdu').PDU,
	EventEmitter = require('events').EventEmitter;

function Session(options) {
	EventEmitter.call(this);
	this.options = options || {};
	var self = this;
	var transport = net;
	var connectTimeout;
	this._extractPDUs = this._extractPDUs.bind(self);
	this.sequence = 0;
	this.paused = false;
	this.remoteAddress = null;
	this._proxyProtocolChecked = false;
	this._busy = false;
	this._callbacks = {};
	this._interval = 0;
	this._command_length = null;
	this._mode = null;
	this._id = Math.floor(Math.random() * (999999 - 100000)) + 100000; // random session id
	this._prevBytesRead = 0;
	if (options.socket) {
		// server mode
		this._mode = "server";
		this.socket = options.socket;
	} else {
		// client mode
		this._mode = "client";
		if (options.tls) {
			transport = tls;
		}
		connectTimeout = setTimeout(function() {
			if (self.socket) {
				var e = new Error("Timeout of " + options.connectTimeout + "ms while connecting to " +
					self.options.host + ":" + self.options.port);
				e.code = "ETIMEOUT";
				e.timeout = options.connectTimeout;
				self.socket.destroy(e);
			}
		}, options.connectTimeout);
		this.socket = transport.connect(this.options);
		this.socket.on('connect', (function() {
			clearTimeout(connectTimeout);
			self.remoteAddress = self.socket.remoteAddress;
			self.debug("server.connected", "connected to server", {secure: options.tls});
			self.emit('connect'); // @todo should emmit the session, but it would break BC
			if(self.options.auto_enquire_link_period) {
				self._interval = setInterval(function() {
					self.enquire_link();
				}, self.options.auto_enquire_link_period);
			}
		}).bind(this));
		this.socket.on('secureConnect', (function() {
			self.emit('secureConnect'); // @todo should emmit the session, but it would break BC
		}).bind(this));
	}
	this.remoteAddress = this.socket.remoteAddress;
	this.socket.on('open', function() {
		self.debug("socket.open");
	});
	this.socket.on('readable', function() {
		if ( (self.socket.bytesRead - self._prevBytesRead) > 0 ) {
			// on disconnections the readable event receives 0 bytes, we do not want to debug that
			self.debug("socket.data.in", null, {bytes: self.socket.bytesRead - self._prevBytesRead});
			self._prevBytesRead = self.socket.bytesRead;
		}
		self._extractPDUs();
	});
	this.socket.on('close', function() {
		clearTimeout(connectTimeout);
		if (self._mode === "server") {
			self.debug("client.disconnected", "client has disconnected");
		} else {
			self.debug("server.disconnected", "disconnected from server");
		}
		self.emit('close');
		if(self._interval) {
			clearInterval(self._interval);
			self._interval = 0;
		}
	});
	this.socket.on('error', function(e) {
		clearTimeout(connectTimeout);
		self.debug("socket.error", e.message, e);
		if (self.socket) self.socket.destroy();
		if(self._interval) {
			clearInterval(self._interval);
			self._interval = 0;
		}
		self.emit('error', e); // Emitted errors will kill the program if they're not captured.
	});
}

util.inherits(Session, EventEmitter);

Session.prototype.debug = function(type, msg, payload) {
	if (type === undefined) type = null;
	if (msg === undefined) msg = null;
	if (this.options.debug) {
		var coloredTypes = {
			"reset": "\x1b[0m",
			"dim": "\x1b[2m",
			"client.connected": "\x1b[1m\x1b[34m",
			"client.disconnected": "\x1b[1m\x1b[31m",
			"server.connected": "\x1b[1m\x1b[34m",
			"server.disconnected": "\x1b[1m\x1b[31m",
			"pdu.command.in": "\x1b[36m",
			"pdu.command.out": "\x1b[32m",
			"socket.error": "\x1b[41m\x1b[30m"
		}
		var now = new Date();
		var logBuffer = now.toISOString() +
			" - " + (this._mode === "server" ? "srv" : "cli") +
			" - " + this._id +
			" - " + (coloredTypes.hasOwnProperty(type) ? coloredTypes[type] + type + coloredTypes.reset : type) +
			" - " + (msg !== null ? msg : "" ) +
			" - " + coloredTypes.dim + (payload !== undefined ? JSON.stringify(payload) : "") + coloredTypes.reset;
		if (this.remoteAddress) logBuffer += " - [" + this.remoteAddress + "]"
		console.log( logBuffer );
	}
	this.emit('debug', type, msg, payload);
}

Session.prototype.connect = function() {
	this.sequence = 0;
	this.paused = false;
	this._busy = false;
	this._callbacks = {};
	this.socket.connect(this.options);
};

Session.prototype._extractPDUs = function() {
	if (this._busy) {
		return;
	}
	this._busy = true;
	var pdu;
	while (!this.paused) {
		try {
			if(this._mode === "server" && this.options.enable_proxy_protocol_detection && !this._proxyProtocolChecked) {
				this._handleProxyProtocolV1();
				this._proxyProtocolChecked = true;
			}
			if(!this._command_length) {
				this._command_length = PDU.commandLength(this.socket);
				if(!this._command_length) {
					break;
				}
			}
			if (!(pdu = PDU.fromStream(this.socket, this._command_length))) {
				break;
			}
			this.debug("pdu.command.in", pdu.command, pdu);
		} catch (e) {
			this.emit('error', e);
			return;
		}
		this._command_length = null;
		this.emit('pdu', pdu);
		this.emit(pdu.command, pdu);
		if (pdu.isResponse() && this._callbacks[pdu.sequence_number]) {
			this._callbacks[pdu.sequence_number](pdu);
			delete this._callbacks[pdu.sequence_number];
		}
	}
	this._busy = false;
};

Session.prototype._handleProxyProtocolV1 = function() {
	var proxyBuffer = this.socket.read(6);
	if (!proxyBuffer) {
		return;
	}
	// Header specs: https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt
	if (proxyBuffer.toString() === 'PROXY ') {
		var proxyProtocol = proxyBuffer.toString();
		var char = null;
		var b = null;
		var prevChar = null;
		while (b = this.socket.read(1)) {
			char = b.toString('ascii');
			proxyProtocol += char;

			if (char === "\n" && prevChar === "\r") break;

			if (proxyProtocol.length > 102) {
				this.debug("proxy_protocol.error", "Proxy protocol header cannot exceed 102 bytes", proxyProtocol);
				break;
			}

			prevChar = char;
		}
		this.debug("proxy_protocol.header.decoded", "Decoded", proxyProtocol.split("\r").join("").split("\n").join(""));

		var proxyProtocolAddressFound = null;
		if (proxyProtocol.indexOf('PROXY TCP') === 0) { // 'PROXY TCP(4|6) .+\r\n'
			var proxyProtocolParts = proxyProtocol.substring(10).split(' ');
			if (proxyProtocolParts.length>1) proxyProtocolAddressFound = proxyProtocolParts[1];
		}

		if (proxyProtocolAddressFound) {
			this.remoteAddress = proxyProtocolAddressFound.toLowerCase();
			this.debug("proxy_protocol.address.ok", "Found "+this.remoteAddress, this.remoteAddress);
		} else {
			this.debug("proxy_protocol.address.ko", "Not found");
		}

	} else {
		this.debug("proxy_protocol.header.error","Header mismatch");
		this.socket.unshift(proxyBuffer);
	}
}

Session.prototype.send = function(pdu, responseCallback, sendCallback) {
	if (!this.socket.writable) {
		return false;
	}
	if (!pdu.isResponse()) {
		// when server/session pair is used to proxy smpp
		// traffic, the sequence_number will be provided by
		// client otherwise we generate it automatically
		if (!pdu.sequence_number) {
			if (this.sequence == 0x7FFFFFFF) {
				this.sequence = 0;
			}
			pdu.sequence_number = ++this.sequence;
		}

		if (responseCallback) {
			this._callbacks[pdu.sequence_number] = responseCallback;
		}
	} else if (responseCallback && !sendCallback) {
		sendCallback = responseCallback;
	}
	this.debug("pdu.command.out", pdu.command, pdu);
	var buffer = pdu.toBuffer();
	this.socket.write(buffer, (function() {
		this.debug("socket.data.out", null, {bytes: buffer.length});
		this.emit('send', pdu);
		if (sendCallback) {
			sendCallback(pdu);
		}
	}).bind(this));
	return true;
};

Session.prototype.pause = function() {
	this.paused = true;
};

Session.prototype.resume = function() {
	this.paused = false;
	this._extractPDUs();
};

Session.prototype.close = function(callback) {
	if (callback) {
		this.socket.once('close', callback);
	}
	this.socket.end();
};

Session.prototype.destroy = function(callback) {
	if (callback) {
		this.socket.once('close', callback);
	}
	this.socket.destroy();
};

var createShortcut = function(command) {
	return function(options, responseCallback, sendCallback) {
		if (typeof options == 'function') {
			sendCallback = responseCallback;
			responseCallback = options;
			options = {};
		}
		var pdu = new PDU(command, options);
		return this.send(pdu, responseCallback, sendCallback);
	};
};

for (var command in defs.commands) {
	Session.prototype[command] = createShortcut(command);
}

function Server(options, listener) {
	var self = this;
	this.sessions = [];

	if (typeof options == 'function') {
		listener = options;
		options = {};
	} else {
		options = options || {};
	}

	if (listener) {
		this.on('session', listener);
	}

	this.tls = options.key && options.cert;
	var transport = this.tls ? tls : net;
	this.options = options;

	transport.Server.call(this, options, function(socket) {
		var session = new Session({socket: socket, enable_proxy_protocol_detection: self.options.enable_proxy_protocol_detection, debug: self.options.debug});
		session.debug("client.connected", "client has connected");
		session.server = self;
		self.sessions.push(session);
		socket.on('close', function() {
			self.sessions.splice(self.sessions.indexOf(session), 1);
		});
		self.emit('session', session);
	});
}

util.inherits(Server, net.Server);

function SecureServer(options, listener) {
	Server.call(this, options, listener);
}

util.inherits(SecureServer, tls.Server);

SecureServer.prototype.listen = Server.prototype.listen = function() {
	var args = [this.tls ? 3550 : 2775];
	if (typeof arguments[0] == 'function') {
		args[1] = arguments[0];
	} else if (arguments.length > 0) {
		args = arguments;
	}

	var transport = this.tls ? tls : net;
	return transport.Server.prototype.listen.apply(this, args);
};

exports.createServer = function(options, listener) {
	if (typeof options == 'function') {
		listener = options;
		options = {};
	} else {
		options = options || {};
	}

	if (options.key && options.cert) {
		return new SecureServer(options, listener);
	}

	return new Server(options, listener);
};

exports.connect = exports.createSession = function(url, listener) {
	var options = {};

	if (arguments.length > 1 && typeof listener != 'function') {
		options = {
			host: url,
			port: listener
		};
		listener = arguments[3];
	} else if (typeof url == 'string') {
		options = parse(url);
		options.host = options.slashes ? options.hostname : url;
		options.tls = options.protocol === 'ssmpp:';
	} else if (typeof url == 'function') {
		listener = url;
	} else {
		options = url || {};
		if (options.url) {
			url = parse(options.url);
			options.host = url.hostname;
			options.port = url.port;
			options.tls = url.protocol === 'ssmpp:';
		}
	}
	options.port = options.port || (options.tls ? 3550 : 2775);
	options.debug = options.debug || false;
	options.connectTimeout = options.connectTimeout || 30000;

	var session = new Session(options);
	if (listener) {
		session.on(options.tls ? 'secureConnect' : 'connect', listener);
	}

	return session;
};

exports.addCommand = function(command, options) {
	options.command = command;
	defs.commands[command] = options;
	defs.commandsById[options.id] = options;
	Session.prototype[command] = createShortcut(command);
};

exports.addTLV = function(tag, options) {
	options.tag = tag;
	defs.tlvs[tag] = options;
	defs.tlvsById[options.id] = options;
};

exports.Session = Session;
exports.Server = Server;
exports.SecureServer = SecureServer;
exports.PDU = PDU;
for (var key in defs) {
	exports[key] = defs[key];
}
for (var error in defs.errors) {
	exports[error] = defs.errors[error];
}
for (var key in defs.consts) {
	exports[key] = defs.consts[key];
}
