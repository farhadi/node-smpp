var net = require('net'),
	tls = require('tls'),
	util = require('util'),
	defs = require('./defs'),
	PDU = require('./pdu').PDU,
	EventEmitter = require('events').EventEmitter;

function Session(options) {
	EventEmitter.call(this);
	options = options || {};
	var self = this;
	this.sequence = 0;
	this._callbacks = [];
	this._buffer = new Buffer(0);
	if (options.socket) {
		this.socket = options.socket;
	} else {
		this.port = options.port;
		this.host = options.host;
		this.socket = net.connect(this.port, this.host);
		this.socket.on('connect', function() {
			self.emit('connect');
		});
	}
	this.socket.on('data', function(chunk) {
		self._buffer = Buffer.concat([self._buffer, chunk]);
		self._extractPDUs();
	});
	this.socket.on('close', function() {
		self.emit('close');
	});
	this.socket.on('error', function(e) {
		self.emit('error', e);
	});
}

util.inherits(Session, EventEmitter);

Session.prototype.connect = function() {
	this.sequence = 0;
	this._callbacks = [];
	this._buffer = new Buffer(0);
	this.socket.connect(this.port, this.host);
};

Session.prototype._extractPDUs = function() {
	var pdu;
	while (!this.paused && (pdu = PDU.fromBuffer(this._buffer))) {
		this._buffer = this._buffer.slice(pdu.command_length);
		this.emit('pdu', pdu);
		this.emit(pdu.command, pdu);
		if (pdu.isResponse() && this._callbacks[pdu.sequence_number]) {
			this._callbacks[pdu.sequence_number](pdu);
			delete this._callbacks[pdu.sequence_number];
		}
	}
};

Session.prototype.send = function(pdu, callback) {
	if (!this.socket.writable) {
		return false;
	}
	if (!pdu.isResponse()) {
		pdu.sequence_number = ++this.sequence;
		if (callback) {
			this._callbacks[pdu.sequence_number] = callback;
		}
	}
	this.socket.write(pdu.toBuffer(), function() {
		this.emit('send', pdu);
	}.bind(this));
	return true;
};

Session.prototype.pause = function() {
	this.paused = true;
	this.socket.pause();
};

Session.prototype.resume = function() {
	this.paused = false;
	this.socket.resume();
	this._extractPDUs();
};

Session.prototype.close = function() {
	this.socket.end();
};

var createShortcut = function(command) {
	return function(options, callback) {
		return this.send(new PDU(command, options), callback);
	};
};

for (var command in defs.commands) {
	Session.prototype[command] = createShortcut(command);
}

function Server() {
	var options, self = this;
	var serverClass = net.Server;
	
	this.ssl_require = false;
	
	this.sessions = [];

	if (typeof arguments[0] == 'function') {
		options = {};
		this.on('session', arguments[0]);
	} else {
		options = arguments[0] || {};
		if (typeof arguments[1] == 'function') {
			this.on('session', arguments[1]);
		}
	}
	
	if (options.key && options.cert) {
		serverClass = tls.Server;
		this.ssl_required = true;
	}
	
	serverClass.call(this, options, function(socket) {
		var session = new Session({socket: socket});
		session.server = self;
		self.sessions.push(session);
		socket.on('close', function() {
			var session = self.sessions.indexOf(socket);
			self.emit('session_close', self.sessions[session]);
			self.sessions.splice(session, 1);
		});
		self.emit('session', session);
	});
}

util.inherits(Server, tls.Server);

Server.prototype.listen = function() {
	var args = [2775];
	if (typeof arguments[0] == 'function') {
		args[1] = arguments[0];
	} else if (arguments[0]) {
		args = arguments;
	}
	return tls.Server.prototype.listen.apply(this, args);
};

exports.createServer = function() {
	return new Server(arguments[0], arguments[1]);
};

exports.connect = exports.createSession = function(host, port) {
	return new Session({
		host: host || 'localhost',
		port: port || 2775 // Default SMPP port is 2775
	});
};

exports.addCommand = function(command, options) {
	options.command = command;
	defs.commands[command] = options;
	defs.commandsById[options.id] = options;
	Session.prototype[command] = createShortcut(command);
};

exports.addTLV = function(tag, options) {
	options.tag = tag;
	defs.tlvs[tlv] = options;
	defs.tlvsById[options.id] = options;
};

exports.Session = Session;
exports.Server = Server;
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
