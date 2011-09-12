var defs = require('./defs'),
    commands = defs.commands,
    commandsById = defs.commandsById,
    tlvs = defs.tlvs,
    tlvsById = defs.tlvsById;

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
	this.command_length = 0;
	this.command_id = commands[command].id;
	this.command_status = options.command_status || 0;
	this.sequence_number = options.sequence_number || 0;
	var params = commands[command].params || {};
	for (var key in params) if (params.hasOwnProperty(key)) {
		if (key in options) {
			this[key] = options[key];
		} else {
			this[key] = params[key].default || params[key].type.default;
		}
	}
	for (var key in options) if (options.hasOwnProperty(key) && key in tlvs) {
		this[key] = options[key];
	}
}

PDU.fromBuffer = function(buffer) {
	if (buffer.length < 16 || buffer.length < buffer.readUInt32BE(0)) {
		return false;
	}
	return new PDU(buffer);
};

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
	var filters = {};
	for (var key in params) if (params.hasOwnProperty(key)) {
		if (offset >= this.command_length) {
			break;
		}
		this[key] = params[key].type.read(buffer, offset);
		offset += params[key].type.size(this[key]);
		if (params[key].filter) {
			filters[key] = params[key].filter;
		}
	}
	while (offset < this.command_length) {
		var tlvId = buffer.readUInt16BE(offset);
		var length = buffer.readUInt16BE(offset + 2);
		offset += 4;
		var tlv = tlvsById[tlvId];
		if (!tlv) {
			this[tlvId] = buffer.slice(offset, offset + length);
			offset += length;
			continue;
		}
		var tag = (commands[this.command].tlvMap || {})[tlv.tag] || tlv.tag;
		if (tlv.multiple) {
			if (!this[tag]) {
				this[tag] = [];
			}
			this[tag].push(tlv.type.read(buffer, offset, length));
		} else {
			this[tag] = tlv.type.read(buffer, offset, length);
		}
		offset += length;
		if (tlv.filter) {
			filters[key] = tlv.filter;
		}
	}
	for (var key in filters) if (filters.hasOwnProperty(key)) {
		this[key] = filters[key].decode.call(this, this[key]);
	}
};

PDU.prototype.finalize = function() {
	var params = commands[this.command].params || {};
	for (var key in this) if (this.hasOwnProperty(key)) {
		if (params[key] && params[key].filter) {
			this[key] = params[key].filter.encode.call(this, this[key]);
		} else if (tlvs[key] && tlvs[key].filter) {
			if (tlvs[key].multiple) {
				this[key].forEach(function(value, i) {
					 this[key][i] = tlvs[key].filter.encode.call(this, value);
				}.bind(this));
			} else {
				this[key] = tlvs[key].filter.encode.call(this, this[key]);
			}
		}
	}
	this.command_length = 16;
	for (var key in this) if (this.hasOwnProperty(key)) {
		if (params[key]) {
			this.command_length += params[key].type.size(this[key]);
		} else if (tlvs[key]) {
			var values = tlvs[key].multiple ? this[key] : [this[key]];
			values.forEach(function(value) {
				this.command_length += tlvs[key].type.size(value) + 4;
			}.bind(this));
		}
	}
};

PDU.prototype.toBuffer = function() {
	this.finalize();
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
	for (var key in this) if (this.hasOwnProperty(key) && tlvs[key]) {
		var values = tlvs[key].multiple ? this[key] : [this[key]];
		values.forEach(function(value) {
			buffer.writeUInt16BE(tlvs[key].id, offset);
			var length = tlvs[key].type.size(value);
			buffer.writeUInt16BE(length, offset + 2);
			offset += 4;
			tlvs[key].type.write(value, buffer, offset);
			offset += length;
		});
	}
	return buffer;
};

exports.PDU = PDU;
