var defs = require('./defs'),
    commands = defs.commands,
    commandsById = defs.commandsById;

var pduHeadParams = [
	'command_length',
	'command_id',
	'command_status',
	'sequence_number'
];

function PDU(command, options) {
	if (Buffer.isBuffer(arguments[0])) {
		return this.fromBuffer(arguments[0]);
	}
	options = options || {};
	this.command = command;
	this.command_id = commands[command].id;
	this.command_status = options.command_status || 0;
	this.sequence_number = options.sequence_number || 0;
	var params = commands[command].params || {};
	for (var key in params) if (params.hasOwnProperty(key)) {
		this[key] =
			options[key] || 
			params[key].default || 
			params[key].type.default;
	}
}

Object.defineProperty(PDU.prototype, 'command_length', {
	get: function() {
		var command_length = 16;
		var params = commands[this.command].params || {};
		for (var key in params) if (params.hasOwnProperty(key)) {
			command_length += params[key].type.size(this[key]);
		}
		return command_length;
	},
	set: function(command_length) {
		//PDUs created from buffer have an static command_length
		Object.defineProperty(this, 'command_length', {
			value: command_length,
			writable: true,
			configurable: true,
			enumerable: true
		});
	},
	configurable: true,
	enumerable: true
});

PDU.prototype.isResponse = function() {
	return !!(this.command_id & 0x80000000);
};

PDU.prototype.response = function(options) {
	options = options || {};
	options.sequence_number = this.sequence_number;
	if (this.command == 'unknown') {
		return new PDU('generic_nack', options);
	}
	return new PDU(this.command + '_resp', options);
};

PDU.prototype.fromBuffer = function(buffer) {
	pduHeadParams.forEach(function(key, i) {
		this[key] = buffer.readUInt32BE(i * 4);
	}.bind(this));
	var params, offset = 16;
	if (commandsById[this.command_id]) {
		this.command = commandsById[this.command_id].command;
		params = commands[this.command].params || {};
	} else {
		this.command = 'unknown';
		params = {};
	}
	for (var key in params) if (params.hasOwnProperty(key)) {
		if (offset >= this.command_length) {
			break;
		}
		this[key] = params[key].type.read(buffer, offset);
		offset += params[key].type.size(this[key]);
	}
};

PDU.prototype.toBuffer = function() {
	var buffer = new Buffer(this.command_length);
	pduHeadParams.forEach(function(key, i) {
		buffer.writeUInt32BE(this[key], i * 4);
	}.bind(this));
	var offset = 16;
	var params = commands[this.command].params || {};
	for (var key in params) if (params.hasOwnProperty(key)) {
		params[key].type.write(this[key], buffer, offset);
		offset += params[key].type.size(this[key]);
	}
	return buffer;
};

exports.PDU = PDU;
