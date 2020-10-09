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
	this.sequence = 0;
	this.paused = false;
	this._busy = false;
	this._callbacks = [];
	this._interval = 0;
	this._command_length = null;
	if (options.socket) {
		this.socket = options.socket;
	} else {
		if (options.tls) {
			transport = tls;
		}
		this.socket = transport.connect(this.options);
		this.socket.on('connect', function() {
			self.emit('connect');
			if(self.options.auto_enquire_link_period) {
				self._interval = setInterval(function() {
					self.enquire_link();
				}, self.options.auto_enquire_link_period);
			}
		});
		this.socket.on('secureConnect', function() {
			self.emit('secureConnect');
		});
	}
	this.socket.on('readable', this._extractPDUs.bind(this));
	this.socket.on('close', function() {
		self.emit('close');
		if(self._interval) {
			clearInterval(self._interval);
			self._interval = 0;
		}
	});
	this.socket.on('error', function(e) {
		self.emit('error', e);
		if(self._interval) {
			clearInterval(self._interval);
			self._interval = 0;
		}
	});
}

util.inherits(Session, EventEmitter);

Session.prototype.connect = function() {
	this.sequence = 0;
	this.paused = false;
	this._busy = false;
	this._callbacks = [];
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
			if(!this._command_length) {
				this._command_length = PDU.commandLength(this.socket);
				if(!this._command_length) {
					break;
				}
			}
			if (!(pdu = PDU.fromStream(this.socket, this._command_length))) {
				break;
			}
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

	transport.Server.call(this, options, function(socket) {
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
		options.tls = options.protocol == 'ssmpp:';
	} else if (typeof url == 'function') {
		listener = url;
	} else {
		options = url || {};
		if (options.url) {
			url = parse(options.url);
			options.host = url.hostname;
			options.port = url.port;
			options.tls = url.protocol == 'ssmpp:';
		}
	}
	options.port = options.port || (options.tls ? 3550 : 2775);

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
