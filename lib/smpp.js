var net = require('net'),
	util = require('util'),
	defs = require('./defs'),
	PDU = require('./pdu').PDU,
	EventEmitter = require('events').EventEmitter;

function Session(options) {
	Object.defineProperty(this, "responseTimeout", {
		configurable : false,
		enumerable   : true,
		value        : 30000,    /* 30 seconds */
		writable     : false
	});
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
	var self = this;
	var callback;
	var pdu;

	try {
		while (!this.paused && (pdu = PDU.fromBuffer(this._buffer))) {
			self._buffer = self._buffer.slice(pdu.command_length);
			self.emit('pdu', pdu);
			self.emit(pdu.command, pdu);
			if (pdu.isResponse() && self._callbacks[pdu.sequence_number]) {
				clearTimeout(self._callbacks[pdu.sequence_number].timeout);
				callback = self._callbacks[pdu.sequence_number].callback.bind(null, null, pdu);
				// Ensure that callback executes in a separate call stack.
				process.nextTick(callback);
				delete this._callbacks[pdu.sequence_number];
			}
		}
	}
	catch (error) {
		this.emit("error", new Error("Malformed PDU."));
		this.close();
	}
};
//callback takes two arguments of the form (error, result)
Session.prototype.send = function(pdu, callback) {
	var callback;
	var error;
	var errorCaller;
	var timeout;

	if (!this.socket.writable) {
		return false;
	}
	if (!pdu.isResponse()) {
		pdu.sequence_number = ++this.sequence;
		if (callback) {
			errorCaller = function (pdu) {
				if (this._callbacks[pdu.sequence_number]) {
					error = new Error("Timed out waiting for response to '" + pdu.command +
						"' message with sequence number '" + pdu.sequence_number +"'.");
					callback = this._callbacks[pdu.sequence_number].callback.bind(null, error);
					// Ensure that callback executes in a separate call stack.
					process.nextTick(callback);
					delete this._callbacks[pdu.sequence_number];
				}
			};

			timeout  = setTimeout(errorCaller.bind(this, pdu), this.responseTimeout);
			this._callbacks[pdu.sequence_number] = { timeout : timeout, callback : callback, };
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
			self.sessions.splice(self.sessions.indexOf(socket), 1);
		});
		self.emit('session', session);
	});
}

util.inherits(Server, net.Server);

Server.prototype.listen = function() {
	var args = [2775];
	if (typeof arguments[0] == 'function') {
		args[1] = arguments[0];
	} else if (arguments[0]) {
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

exports.createDeliveryAcknowledgement = require('./pdu').createDeliveryAcknowledgement;
exports.getDataDeliveryAcknowledgement = require('./pdu').getDataDeliveryAcknowledgement;
