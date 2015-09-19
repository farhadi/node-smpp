var net = require('net'),
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
	this.socket.on('readable', function() {
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
	this.socket.connect(this.port, this.host);
};

Session.prototype._extractPDUs = function() {
	var pdu;
	try {
		while (!this.paused && (pdu = PDU.fromStream(this.socket))) {
			this.emit('pdu', pdu);
			this.emit(pdu.command, pdu);
			if (pdu.isResponse() && this._callbacks[pdu.sequence_number]) {
				this._callbacks[pdu.sequence_number](pdu);
				delete this._callbacks[pdu.sequence_number];
			}
		}
	} catch (e) {
		this.emit('error', e);
	}
};

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
	this.socket.write(pdu.toBuffer(), function() {
		this.emit('send', pdu);
		if (sendCallback) {
			sendCallback(pdu);
		}
	}.bind(this));
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

var createShortcut = function(command) {
	return function(options, responseCallback, sendCallback) {
		var pdu = new PDU(command, options);
		return this.send(pdu, responseCallback, sendCallback);
	};
};

for (var command in defs.commands) {
	Session.prototype[command] = createShortcut(command);
}

function Server() {
	var options, self = this;
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

	net.Server.call(this, options, function(socket) {
		var session = new Session({socket: socket});
		session.server = self;
		self.sessions.push(session);
		socket.on('close', function() {
			self.sessions.splice(self.sessions.indexOf(session), 1);
		});
		self.emit('session', session);
	});
}

util.inherits(Server, net.Server);

Server.prototype.listen = function() {
	var args = [2775];
	if (typeof arguments[0] == 'function') {
		args[1] = arguments[0];
	} else if (arguments.length > 0) {
		args = arguments;
	}
	return net.Server.prototype.listen.apply(this, args);
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
	defs.tlvs[tag] = options;
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
