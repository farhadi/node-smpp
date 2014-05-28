var defs = require('./defs'),
    commands = defs.commands,
    commandsById = defs.commandsById,
    tlvs = defs.tlvs,
    tlvsById = defs.tlvsById;
var _      = require("lodash");
var moment = require("moment");

var pduHeadParams = [
	'command_length',
	'command_id',
	'command_status',
	'sequence_number'
];

function PDU(command, options) {
	if (Buffer.isBuffer(command)) {
		return this.fromBuffer(command);
	}
	options = options || {};
	this.command = command;
	this.command_length = 0;
	this.command_id = commands[command].id;
	this.command_status = options.command_status || 0;
	this.sequence_number = options.sequence_number || 0;
	var params = _.cloneDeep(commands[command].params) || {};
	for (var key in params) {
		this[key] = options[key] || params[key].default || params[key].type.default;
	}
	for (var key in options) if (key in tlvs) {
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
		if (!('command_status' in options)) {
			options.command_status = defs.errors.ESME_RINVCMDID;
		}
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
	for (var key in params) {
		if (offset >= this.command_length) {
			break;
		}
		this[key] = params[key].type.read(buffer, offset);
		offset += params[key].type.size(this[key]);
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
	}
	this._filter('decode');
};

PDU.prototype._filter = function(func) {
	var params = commands[this.command].params || {};
	for (var key in this) {
		if (params[key] && params[key].filter) {
			this[key] = params[key].filter[func].call(this, this[key]);
		} else if (tlvs[key] && tlvs[key].filter) {
			if (tlvs[key].multiple) {
				this[key].forEach(function(value, i) {
					 this[key][i] = tlvs[key].filter[func].call(this, value);
				}.bind(this));
			} else {
				this[key] = tlvs[key].filter[func].call(this, this[key]);
			}
		}
	}
};

PDU.prototype.toBuffer = function() {
	this._filter('encode');
	var params = commands[this.command].params || {};
	this.command_length = 16;
	for (var key in this) {
		if (params[key]) {
			this.command_length += params[key].type.size(this[key]);
		} else if (tlvs[key]) {
			var values = tlvs[key].multiple ? this[key] : [this[key]];
			values.forEach(function(value) {
				this.command_length += tlvs[key].type.size(value) + 4;
			}.bind(this));
		}
	}
	var buffer = new Buffer(this.command_length);
	pduHeadParams.forEach(function(key, i) {
		buffer.writeUInt32BE(this[key], i * 4);
	}.bind(this));
	var offset = 16;
	for (var key in params) {
		params[key].type.write(this[key], buffer, offset);
		offset += params[key].type.size(this[key]);
	}
	for (var key in this) if (tlvs[key]) {
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

PDU.prototype.isDeliveryAcknowledgement = function () {
	return !!((this.command === "deliver_sm" || this.command === "data_sm") &&
				(this.esm_class & defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT));
}

exports.createDeliveryAcknowledgement = function (pdu, options) {

	if (pdu.command !== "deliver_sm" && pdu.command !== "data_sm") {
		return;
	}

	pdu.esm_class |= defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT;
	options = options || {};

	var now        = moment().format("YYMMDDHHmm");
	var id         = options.id || "";
	var sub        = options.sub || "001";
	var dlvrd      = options.dlvrd || "001";
	var submitDate = options.submitDate || now;
	var doneDate   = options.doneDate || now;
	var status     = options.status || "UNKNOWN";
	var error      = options.error || "000";
	var text       = options.text || "none";
	var message;

	message  = "id:" + id;
	message += " sub:" + sub;
	message += " dlvrd:" + dlvrd;
	message += " submit date:" + submitDate
	message += " done date:" + doneDate;
	message += " stat:" + status;
	message += " err:" + error;
	message += " text:" + text;

	if (pdu.command === "data_sm") {
		pdu.message_payload = message;
	}
	else {
		pdu.short_message.message = message;
	}
}

exports.getDataDeliveryAcknowledgement = function (pdu) {
	if (!pdu.isDeliveryAcknowledgement()) {
		return null;
	}

	var message;
	var dataDlrRegex;
	var dataDlr;

	if ("message_payload" in pdu) {
		message = pdu.message_payload;
	}
	else if ("short_message" in pdu){
		message = (typeof pdu.short_message === "string") ? pdu.short_message : pdu.short_message.message;
	}
	else {
		return null;
	}
	dataDlrRegex = {
		id         : /id:([\w-]+)\b/,
		sub        : /sub:([\d]{3})\b/,
		dlvrd      : /dlvrd:([\d]{3})\b/,
		submitDate : /submit date:([\d]{10})\b/,
		doneDate   : /done date:([\d]{10})\b/,
		status     : /stat:([A-Z]{7})\b/,
		error      : /err:([\d]{3})\b/,
		text       : /text:(.*)$/
	};

	dataDlr = _.mapValues(dataDlrRegex, function (regex, index) {
		var match = regex.exec(message);
		if (!match) {
			return null;
		}
		else {
			return match[1];
		}
	});
	return dataDlr;
}

exports.PDU = PDU;
