var iconv = require('iconv-lite'),
	Buffer = require('safer-buffer').Buffer;

var types = {
	int8: {
		read: function(buffer, offset) {
			return buffer.readUInt8(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt8(value, offset);
		},
		size: function() {
			return 1;
		},
		default: 0
	},
	int16: {
		read: function(buffer, offset) {
			return buffer.readUInt16BE(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt16BE(value, offset);
		},
		size: function() {
			return 2;
		},
		default: 0
	},
	int32: {
		read: function(buffer, offset) {
			return buffer.readUInt32BE(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt32BE(value, offset);
		},
		size: function() {
			return 4;
		},
		default: 0
	},
	string: {
		read: function(buffer, offset) {
			var length = buffer.readUInt8(offset++);
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			if (!Buffer.isBuffer(value)) {
				value = Buffer.from(String(value), 'ascii');
			}
			buffer.writeUInt8(value.length, offset++);
			value.copy(buffer, offset);
		},
		size: function(value) {
			return (value.length || String(value).length) + 1;
		},
		default: ''
	},
	cstring: {
		read: function(buffer, offset) {
			var length = 0;
			while (buffer[offset + length]) {
				length++;
			}
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			if (!Buffer.isBuffer(value)) {
				value = Buffer.from(String(value), 'ascii');
			}
			value.copy(buffer, offset);
			buffer[offset + value.length] = 0;
		},
		size: function(value) {
			return (value.length || String(value).length) + 1;
		},
		default: ''
	},
	buffer: {
		read: function(buffer, offset) {
			var length = buffer.readUInt8(offset++);
			return buffer.slice(offset, offset + length);
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			if (typeof value == 'string') {
				value = Buffer.from(value, 'ascii');
			}
			value.copy(buffer, offset);
		},
		size: function(value) {
			return value.length + 1;
		},
		default: Buffer.alloc(0)
	},
	dest_address_array: {
		read: function(buffer, offset) {
			var dest_address, dest_flag, result = [];
			var number_of_dests = buffer.readUInt8(offset++);
			while (number_of_dests-- > 0) {
				dest_flag = buffer.readUInt8(offset++);
				if (dest_flag == 1) {
					dest_address = {
						dest_addr_ton: buffer.readUInt8(offset++),
						dest_addr_npi: buffer.readUInt8(offset++),
						destination_addr: types.cstring.read(buffer, offset)
					};
					offset += types.cstring.size(dest_address.destination_addr);
				} else {
					dest_address = {
						dl_name: types.cstring.read(buffer, offset)
					};
					offset += types.cstring.size(dest_address.dl_name);
				}
				result.push(dest_address);
			}
			return result;
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			value.forEach(function(dest_address) {
				if ('dl_name' in dest_address) {
					buffer.writeUInt8(2, offset++);
					types.cstring.write(dest_address.dl_name, buffer, offset);
					offset += types.cstring.size(dest_address.dl_name);
				} else {
					buffer.writeUInt8(1, offset++);
					buffer.writeUInt8(dest_address.dest_addr_ton || 0, offset++);
					buffer.writeUInt8(dest_address.dest_addr_npi || 0, offset++);
					types.cstring.write(dest_address.destination_addr, buffer, offset);
					offset += types.cstring.size(dest_address.destination_addr);
				}
			});
		},
		size: function(value) {
			var size = 1;
			value.forEach(function(dest_address) {
				if ('dl_name' in dest_address) {
					size += types.cstring.size(dest_address.dl_name) + 1;
				} else {
					size += types.cstring.size(dest_address.destination_addr) + 3;
				}
			});
			return size;
		},
		default: []
	},
	unsuccess_sme_array: {
		read: function(buffer, offset) {
			var unsuccess_sme, result = [];
			var no_unsuccess = buffer.readUInt8(offset++);
			while (no_unsuccess-- > 0) {
				unsuccess_sme = {
					dest_addr_ton: buffer.readUInt8(offset++),
					dest_addr_npi: buffer.readUInt8(offset++),
					destination_addr: types.cstring.read(buffer, offset)
				};
				offset += types.cstring.size(unsuccess_sme.destination_addr);
				unsuccess_sme.error_status_code = buffer.readUInt32BE(offset);
				offset += 4;
				result.push(unsuccess_sme);
			}
			return result;
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			value.forEach(function(unsuccess_sme) {
				buffer.writeUInt8(unsuccess_sme.dest_addr_ton || 0, offset++);
				buffer.writeUInt8(unsuccess_sme.dest_addr_npi || 0, offset++);
				types.cstring.write(unsuccess_sme.destination_addr, buffer, offset);
				offset += types.cstring.size(unsuccess_sme.destination_addr);
				buffer.writeUInt32BE(unsuccess_sme.error_status_code, offset);
				offset += 4;
			});
		},
		size: function(value) {
			var size = 1;
			value.forEach(function(unsuccess_sme) {
				size += types.cstring.size(unsuccess_sme.destination_addr) + 6;
			});
			return size;
		},
		default: []
	}
};

types.tlv = {
	int8: types.int8,
	int16: types.int16,
	int32: types.int32,
	cstring: types.cstring,
	string: {
		read: function(buffer, offset, length) {
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			if (typeof value == 'string') {
				value = Buffer.from(value, 'ascii');
			}
			value.copy(buffer, offset);
		},
		size: function(value) {
			return value.length;
		},
		default: ''
	},
	buffer: {
		read: function(buffer, offset, length) {
			return buffer.slice(offset, offset + length);
		},
		write: function(value, buffer, offset) {
			if (typeof value == 'string') {
				value = Buffer.from(value, 'ascii');
			}
			value.copy(buffer, offset);
		},
		size: function(value) {
			return value.length;
		},
		default: null
	}
};

var gsmCoder = {
	// GSM 03.38
	GSM: {
		chars: '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
		extChars: '\f^{}\\\\[~]|€',
		escChars: '\nΛ()\\/<=>¡e',
		charRegex: /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà\f^{}\\[~\]|€]*$/,
		charListEnc: {},
		extCharListEnc: {},
		charListDec: {},
		extCharListDec: {}
	},
	// GSM 03.38 Turkish Shift Table
	GSM_TR: {
		chars: '@£$¥€éùıòÇ\nĞğ\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BŞşßÉ !"#¤%&\'()*+,-./0123456789:;<=>?İABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§çabcdefghijklmnopqrstuvwxyzäöñüà',
		extCharsEnc: '\f^{}\\\\[~]|',
		escCharsEnc: '\nΛ()\\/<=>İ',
		extCharsDec: '\f^{}\\[~]|ĞİŞç€ğış',
		escCharsDec: '\nΛ()/<=>İGIScegis',
		charRegex: /^[@£$¥€éùıòÇ\nĞğ\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BŞşßÉ !"#¤%&\'()*+,-./0-9:;<=>?İA-ZÄÖÑÜ§ça-zäöñüà\f^{}\\[~\]|ĞİŞç€ğış]*$/,
		charListEnc: {},
		extCharListEnc: {},
		charListDec: {},
		extCharListDec: {}
	},
	// GSM 03.38 Spanish Shift Table
	GSM_ES: {
		chars: '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
		extChars: 'ç\f^{}\\\\[~]|ÁÍÓÚá€íóú',
		escChars: 'Ç\nΛ()\\/<=>¡AIOUaeiou',
		charRegex: /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüàç\f^{}\\[~\]|ÁÍÓÚá€íóú]*$/,
		charListEnc: {},
		extCharListEnc: {},
		charListDec: {},
		extCharListDec: {}
	},
	// GSM 03.38 Portuguese Shift Table
	GSM_PT: {
		chars: '@£$¥êéúíóç\nÔô\rÁáΔ_ªÇÀ∞^\\€Ó|\x1BÂâÊÉ !"#º%&\'()*+,-./0123456789:;<=>?ÍABCDEFGHIJKLMNOPQRSTUVWXYZÃÕÚÜ§~abcdefghijklmnopqrstuvwxyzãõ`üà',
		extCharsEnc: '\fΦΓ^ΩΠΨΣΘ{}\\\\[~]|',
		escCharsEnc: '\nªÇÀ∞^\\€Ó()\\/<=>Í',
		extCharsDec: 'êç\fÔôÁáΦΓ^ΩΠ ΨΣΘÊ{}\\[~]|ÀÍÓÚÃÕÂ€íóúãõâ',
		escCharsDec: 'éç\nÔôÁáªÇÀ∞^\\\\€ÓÉ()/<=>ÍAIOUÃÕaeiouãõà',
		charRegex: /^[@£$¥êéúíóç\nÔô\rÁáΔ_ªÇÀ∞^\\€Ó|\x1BÂâÊÉ !"#º%&\'()*+,-./0-9:;<=>?ÍA-ZÃÕÚÜ§~a-zãõ`üàêç\fÔôÁáΦΓ^ΩΠΨΣΘÊ{}\\[~\]|ÀÍÓÚÃÕÂ€íóúãõâ]*$/,
		charListEnc: {},
		extCharListEnc: {},
		charListDec: {},
		extCharListDec: {}
	}
};

gsmCoder.getCoder = function(encoding) {
	var coder = this.GSM;
	switch (encoding) {
		case 0x01:
			coder = this.GSM_TR;
			break;
		case 0x02:
			coder = this.GSM_ES;
			break;
		case 0x03:
			coder = this.GSM_PT;
			break;
	}

	if (Object.keys(coder.charListEnc).length === 0) {
		for (var i = 0; i < coder.chars.length; i++) {
			coder.charListEnc[coder.chars[i]] = i;
			coder.charListDec[i] = coder.chars[i];
		}

		var extCharsEnc = coder.extCharsEnc || coder.extChars;
		var escCharsEnc = coder.escCharsEnc || coder.escChars;
		for (var i = 0; i < extCharsEnc.length; i++) {
			coder.extCharListEnc[extCharsEnc[i]] = escCharsEnc[i];
		}

		var extCharsDec = coder.extCharsDec || coder.extChars;
		var escCharsDec = coder.escCharsDec || coder.escChars;
		for (var i = 0; i < escCharsDec.length; i++) {
			coder.extCharListDec[escCharsDec[i]] = extCharsDec[i];
		}
	}

	return coder;
};

gsmCoder.encode = function(string, encoding) {
	var coder = this.getCoder(encoding);
	var extCharsEnc = coder.extCharsEnc || coder.extChars;
	var extCharRegex = new RegExp('[' + extCharsEnc.replace(']', '\\]') + ']', 'g');

	string = string.replace(extCharRegex, function(match) {
		return '\x1B' + coder.extCharListEnc[match];
	});

	var result = [];

	for (var i = 0; i < string.length; i++) {
		result.push(string[i] in coder.charListEnc ? coder.charListEnc[string[i]] : '\x20');
	}

	return Buffer.from(result);
};

gsmCoder.decode = function (string, encoding) {
	var coder = this.getCoder(encoding);
	var escCharsDec = coder.escCharsDec || coder.escChars;
	var escCharRegex = new RegExp('\x1B([' + escCharsDec + '])', 'g');
	var result = '';

	for (var i = 0; i < string.length; i++) {
		result += coder.charListDec[string[i]] || ' ';
	}

	return result.replace(escCharRegex, function(match, p1) {
		return coder.extCharListDec[p1];
	});
};

gsmCoder.detect = function (string) {
	if (gsmCoder.GSM_ES.charRegex.test(string)) {
		return 0x02;
	}

	if (gsmCoder.GSM_PT.charRegex.test(string)) {
		return 0x03;
	}

	if (gsmCoder.GSM_TR.charRegex.test(string)) {
		return 0x01;
	}

	if (gsmCoder.GSM.charRegex.test(string)) {
		return 0x00;
	}

	return undefined;
};

var encodings = {};

encodings.ASCII = { // GSM 03.38
	match: function(value) {
		return gsmCoder.GSM.charRegex.test(value);
	},
	encode: function(value) {
		return gsmCoder.encode(value, 0x00);
	},
	decode: function(value) {
		return gsmCoder.decode(value, 0x00);
	}
};

encodings.LATIN1 = {
	match: function(value) {
		return value === iconv.decode(iconv.encode(value, 'latin1'), 'latin1');
	},
	encode: function(value) {
		return iconv.encode(value, 'latin1');
	},
	decode: function(value) {
		return iconv.decode(value, 'latin1');
	}
};

encodings.UCS2 = {
	match: function(value) {
		return true;
	},
	encode: function(value) {
		return iconv.encode(value, 'utf16-be');
	},
	decode: function(value) {
		return iconv.decode(value, 'utf16-be');
	}
};

Object.defineProperty(encodings, 'detect', {
	value: function(value) {
		for (var key in encodings) {
			if (encodings[key].match(value)) {
				return key;
			}
		}
		return false;
	}
});

Object.defineProperty(encodings, 'default', {
	value: 'ASCII',
	writable: true
});

var udhCoder = {};

/**
 * @param buffer:Buffer
 *
 * @return Array
 */
udhCoder.getUdh = function(buffer) {
	var bufferLength = buffer.length;

	if (bufferLength <= 1) {
		return [];
	}

	var udhList = [];

	var cursor = 1;
	do {
		var udhLength = buffer[cursor + 1] + 2;
		udhList.push(buffer.slice(cursor, cursor + udhLength));
		cursor += udhLength;
	} while (cursor < bufferLength);

	return udhList;
};

var filters = {};

filters.time = {
	encode: function(value) {
		if (!value) {
			return value;
		}
		if (typeof value == 'string') {
			if (value.length <= 12) {
				value = ('000000000000' + value).substr(-12) + '000R';
			}
			return value;
		}
		if (value instanceof Date) {
			var result = value.getUTCFullYear().toString().substr(-2);
			result += ('0' + (value.getUTCMonth() + 1)).substr(-2);
			result += ('0' + value.getUTCDate()).substr(-2);
			result += ('0' + value.getUTCHours()).substr(-2);
			result += ('0' + value.getUTCMinutes()).substr(-2);
			result += ('0' + value.getUTCSeconds()).substr(-2);
			result += ('00' + value.getUTCMilliseconds()).substr(-3, 1);
			result += '00+';
			return result;
		}
		return value;
	},
	decode: function(value) {
		if (!value || typeof value != 'string') {
			return value;
		}
		if (value.substr(-1) == 'R') {
			var result = new Date();
			var match = value.match(/^(..)(..)(..)(..)(..)(..).*$/);
			['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds'].forEach(
				function(method, i) {
					result['set' + method](result['get' + method]() + +match[++i]);
				}
			);
			return result;
		}
		var century = ('000' + new Date().getUTCFullYear()).substr(-4, 2);
		var result = new Date(value.replace(
			/^(..)(..)(..)(..)(..)(..)(.)?.*$/,
			century + '$1-$2-$3 $4:$5:$6:$700 UTC'
		));
		var match = value.match(/(..)([-+])$/);
		if (match && match[1] != '00') {
			var diff = match[1] * 15;
			if (match[2] == '+') {
				diff = -diff;
			}
			result.setMinutes(result.getMinutes() + diff);
		}
		return result;
	}
};

filters.message = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var message = typeof value === 'string' ? value : value.message;
		if (typeof message === 'string' && message) {
			var encoded = false;
			if (value.udh) {
				var udhList = udhCoder.getUdh(value.udh);
				for (var i = 0; i < udhList.length; i++) {
					var udh = udhList[i];
					if (udh[0] === 0x24 || udh[0] === 0x25) {
						this.data_coding = consts.ENCODING.ASCII;
						message = gsmCoder.encode(message, udh[2]);
						encoded = true;
						break;
					}
				}
			}
			if (!encoded) {
				var encoding = encodings.default;
				if (this.data_coding === null) {
					encoding = encodings.detect(message);
					this.data_coding = consts.ENCODING[encoding];
				} else if (this.data_coding !== consts.ENCODING.SMSC_DEFAULT) {
					for (var key in consts.ENCODING) {
						if (consts.ENCODING[key] === this.data_coding) {
							encoding = key;
							break;
						}
					}
				}
				message = encodings[encoding].encode(message);
			}
		}
		if (!value.udh || !value.udh.length) {
			return message;
		}
		if ('esm_class' in this) {
			this.esm_class = this.esm_class | consts.ESM_CLASS.UDH_INDICATOR;
		}
		return Buffer.concat([value.udh, message]);
	},
	decode: function(value, skipUdh) {
		if (!Buffer.isBuffer(value) || !('data_coding' in this)) {
			return value;
		}
		var encoding = this.data_coding & 0x0F;
		if (!encoding) {
			encoding = encodings.default;
		} else {
			for (var key in consts.ENCODING) {
				if (consts.ENCODING[key] == encoding) {
					encoding = key;
					break;
				}
			}
		}
		var udhi = this.esm_class & (consts.ESM_CLASS.UDH_INDICATOR || consts.ESM_CLASS.KANNEL_UDH_INDICATOR);
		var result = {};
		if (!skipUdh && value.length && udhi) {
			result.udh = udhCoder.getUdh(value.slice(0, value[0] + 1));
			result.message = value.slice(value[0] + 1);
		} else {
			result.message = value;
		}
		if (result.udh && (encoding === consts.ENCODING.SMSC_DEFAULT || consts.ENCODING.ASCII)) {
			var decoded = false;
			for (var i = 0; i < result.udh.length; i++) {
				var udh = result.udh[i];
				if (udh[0] === 0x24 || udh[0] === 0x25) {
					result.message = gsmCoder.decode(result.message, udh[2]);
					decoded = true;
					break;
				}
			}
			if (!decoded && encodings[encoding]) {
				result.message = encodings[encoding].decode(result.message);
			}
		} else if (encodings[encoding]) {
			result.message = encodings[encoding].decode(result.message);
		}
		return result;
	}
};

filters.billing_identification = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var result = Buffer.alloc(value.data.length + 1);
		result.writeUInt8(value.format, 0);
		value.data.copy(result, 1);
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		return {
			format: value.readUInt8(0),
			data: value.slice(1)
		};
	}
};

filters.broadcast_area_identifier = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		if (typeof value == 'string') {
			value = {
				format: consts.BROADCAST_AREA_FORMAT.NAME,
				data: value
			};
		}
		if (typeof value.data == 'string') {
			value.data = Buffer.from(value.data, 'ascii');
		}
		var result = Buffer.alloc(value.data.length + 1);
		result.writeUInt8(value.format, 0);
		value.data.copy(result, 1);
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		var result = {
			format: value.readUInt8(0),
			data: value.slice(1)
		};
		if (result.format == consts.BROADCAST_AREA_FORMAT.NAME) {
			result.data = result.data.toString('ascii');
		}
		return result;
	}
};

filters.broadcast_content_type = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var result = Buffer.alloc(3);
		result.writeUInt8(value.network, 0);
		result.writeUInt16BE(value.content_type, 1);
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		return {
			network: value.readUInt8(0),
			content_type: value.readUInt16BE(1)
		};
	}
};

filters.broadcast_frequency_interval = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var result = Buffer.alloc(3);
		result.writeUInt8(value.unit, 0);
		result.writeUInt16BE(value.interval, 1);
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		return {
			unit: value.readUInt8(0),
			interval: value.readUInt16BE(1)
		};
	}
};

filters.callback_num = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var result = Buffer.alloc(value.number.length + 3);
		result.writeUInt8(value.digit_mode || 0, 0);
		result.writeUInt8(value.ton || 0, 1);
		result.writeUInt8(value.npi || 0, 2);
		result.write(value.number, 3, 'ascii');
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		return {
			digit_mode: value.readUInt8(0),
			ton: value.readUInt8(1),
			npi: value.readUInt8(2),
			number: value.toString('ascii', 3)
		};
	}
};

filters.callback_num_atag = {
	encode: function(value) {
		if (Buffer.isBuffer(value)) {
			return value;
		}
		var result = Buffer.alloc(value.display.length + 1);
		result.writeUInt8(value.encoding, 0);
		if (typeof value.display == 'string') {
			value.display = Buffer.from(value.display, 'ascii');
		}
		value.display.copy(result, 1);
		return result;
	},
	decode: function(value) {
		if (!Buffer.isBuffer(value)) {
			return value;
		}
		return {
			encoding: value.readUInt8(0),
			display: value.slice(1)
		};
	}
};

var tlvs = {
	dest_addr_subunit: {
		id: 0x0005,
		type: types.tlv.int8
	},
	dest_network_type: {
		id: 0x0006,
		type: types.tlv.int8
	},
	dest_bearer_type: {
		id: 0x0007,
		type: types.tlv.int8
	},
	dest_telematics_id: {
		id: 0x0008,
		type: types.tlv.int16
	},
	source_addr_subunit: {
		id: 0x000D,
		type: types.tlv.int8
	},
	source_network_type: {
		id: 0x000E,
		type: types.tlv.int8
	},
	source_bearer_type: {
		id: 0x000F,
		type: types.tlv.int8
	},
	source_telematics_id: {
		id: 0x0010,
		type: types.tlv.int16
	},
	qos_time_to_live: {
		id: 0x0017,
		type: types.tlv.int32
	},
	payload_type: {
		id: 0x0019,
		type: types.tlv.int8
	},
	additional_status_info_text: {
		id: 0x001D,
		type: types.tlv.cstring
	},
	receipted_message_id: {
		id: 0x001E,
		type: types.tlv.cstring
	},
	ms_msg_wait_facilities: {
		id: 0x0030,
		type: types.tlv.int8
	},
	privacy_indicator: {
		id: 0x0201,
		type: types.tlv.int8
	},
	source_subaddress: {
		id: 0x0202,
		type: types.tlv.buffer
	},
	dest_subaddress: {
		id: 0x0203,
		type: types.tlv.buffer
	},
	user_message_reference: {
		id: 0x0204,
		type: types.tlv.int16
	},
	user_response_code: {
		id: 0x0205,
		type: types.tlv.int8
	},
	source_port: {
		id: 0x020A,
		type: types.tlv.int16
	},
	dest_port: {
		id: 0x020B,
		type: types.tlv.int16
	},
	sar_msg_ref_num: {
		id: 0x020C,
		type: types.tlv.int16
	},
	language_indicator: {
		id: 0x020D,
		type: types.tlv.int8
	},
	sar_total_segments: {
		id: 0x020E,
		type: types.tlv.int8
	},
	sar_segment_seqnum: {
		id: 0x020F,
		type: types.tlv.int8
	},
	sc_interface_version: {
		id: 0x0210,
		type: types.tlv.int8
	},
	callback_num_pres_ind: {
		id: 0x0302,
		type: types.tlv.int8,
		multiple: true
	},
	callback_num_atag: {
		id: 0x0303,
		type: types.tlv.buffer,
		filter: filters.callback_num_atag,
		multiple: true
	},
	number_of_messages: {
		id: 0x0304,
		type: types.tlv.int8
	},
	callback_num: {
		id: 0x0381,
		type: types.tlv.buffer,
		filter: filters.callback_num,
		multiple: true
	},
	dpf_result: {
		id: 0x0420,
		type: types.tlv.int8
	},
	set_dpf: {
		id: 0x0421,
		type: types.tlv.int8
	},
	ms_availability_status: {
		id: 0x0422,
		type: types.tlv.int8
	},
	network_error_code: {
		id: 0x0423,
		type: types.tlv.buffer
	},
	message_payload: {
		id: 0x0424,
		type: types.tlv.buffer,
		filter: filters.message
	},
	delivery_failure_reason: {
		id: 0x0425,
		type: types.tlv.int8
	},
	more_messages_to_send: {
		id: 0x0426,
		type: types.tlv.int8
	},
	message_state: {
		id: 0x0427,
		type: types.tlv.int8
	},
	congestion_state: {
		id: 0x0428,
		type: types.tlv.int8
	},
	ussd_service_op: {
		id: 0x0501,
		type: types.tlv.int8
	},
	broadcast_channel_indicator: {
		id: 0x0600,
		type: types.tlv.int8
	},
	broadcast_content_type: {
		id: 0x0601,
		type: types.tlv.buffer,
		filter: filters.broadcast_content_type
	},
	broadcast_content_type_info: {
		id: 0x0602,
		type: types.tlv.string
	},
	broadcast_message_class: {
		id: 0x0603,
		type: types.tlv.int8
	},
	broadcast_rep_num: {
		id: 0x0604,
		type: types.tlv.int16
	},
	broadcast_frequency_interval: {
		id: 0x0605,
		type: types.tlv.buffer,
		filter: filters.broadcast_frequency_interval
	},
	broadcast_area_identifier: {
		id: 0x0606,
		type: types.tlv.buffer,
		filter: filters.broadcast_area_identifier,
		multiple: true
	},
	broadcast_error_status: {
		id: 0x0607,
		type: types.tlv.int32,
		multiple: true
	},
	broadcast_area_success: {
		id: 0x0608,
		type: types.tlv.int8
	},
	broadcast_end_time: {
		id: 0x0609,
		type: types.tlv.string,
		filter: filters.time
	},
	broadcast_service_group: {
		id: 0x060A,
		type: types.tlv.string
	},
	billing_identification: {
		id: 0x060B,
		type: types.tlv.buffer,
		filter: filters.billing_identification
	},
	source_network_id: {
		id: 0x060D,
		type: types.tlv.cstring
	},
	dest_network_id: {
		id: 0x060E,
		type: types.tlv.cstring
	},
	source_node_id: {
		id: 0x060F,
		type: types.tlv.string
	},
	dest_node_id: {
		id: 0x0610,
		type: types.tlv.string
	},
	dest_addr_np_resolution: {
		id: 0x0611,
		type: types.tlv.int8
	},
	dest_addr_np_information: {
		id: 0x0612,
		type: types.tlv.string
	},
	dest_addr_np_country: {
		id: 0x0613,
		type: types.tlv.int32
	},
	display_time: {
		id: 0x1201,
		type: types.tlv.int8
	},
	sms_signal: {
		id: 0x1203,
		type: types.tlv.int16
	},
	ms_validity: {
		id: 0x1204,
		type: types.tlv.buffer
	},
	alert_on_message_delivery: {
		id: 0x130C,
		type: types.tlv.int8
	},
	its_reply_type: {
		id: 0x1380,
		type: types.tlv.int8
	},
	its_session_info: {
		id: 0x1383,
		type: types.tlv.buffer
	}
};

var tlvsById = {};

for (var tag in tlvs) {
	tlvsById[tlvs[tag].id] = tlvs[tag];
	tlvs[tag].tag = tag;
}

tlvs.alert_on_msg_delivery = tlvs.alert_on_message_delivery;
tlvs.failed_broadcast_area_identifier = tlvs.broadcast_area_identifier;

var commands = {
	alert_notification: {
		id: 0x00000102,
		params: {
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			esme_addr_ton: {type: types.int8},
			esme_addr_npi: {type: types.int8},
			esme_addr: {type: types.cstring}
		}
	},
	bind_receiver: {
		id: 0x00000001,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_receiver_resp: {
		id: 0x80000001,
		params: {
			system_id: {type: types.cstring}
		}
	},
	bind_transmitter: {
		id: 0x00000002,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_transmitter_resp: {
		id: 0x80000002,
		params: {
			system_id: {type: types.cstring}
		}
	},
	bind_transceiver: {
		id: 0x00000009,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_transceiver_resp: {
		id: 0x80000009,
		params: {
			system_id: {type: types.cstring}
		}
	},
	broadcast_sm: {
		id: 0x00000111,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			message_id: {type: types.cstring},
			priority_flag: {type: types.int8},
			schedule_delivery_time:	{type: types.cstring, filter: filters.time},
			validity_period: {type: types.cstring, filter: filters.time},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8, default: null},
			sm_default_msg_id: {type: types.int8}
		}
	},
	broadcast_sm_resp: {
		id: 0x80000111,
		params: {
			message_id: {type: types.cstring}
		},
		tlvMap: {
			broadcast_area_identifier: 'failed_broadcast_area_identifier'
		}
	},
	cancel_broadcast_sm: {
		id: 0x00000113,
		params: {
			service_type: {type: types.cstring},
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	cancel_broadcast_sm_resp: {
		id: 0x80000113
	},
	cancel_sm: {
		id: 0x00000008,
		params: {
			service_type: {type: types.cstring},
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring}
		}
	},
	cancel_sm_resp: {
		id: 0x80000008
	},
	data_sm: {
		id: 0x00000103,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			registered_delivery: {type: types.int8},
			data_coding: {type: types.int8, default: null}
		}
	},
	data_sm_resp: {
		id: 0x80000103,
		params: {
			message_id: {type: types.cstring}
		}
	},
	deliver_sm: {
		id: 0x00000005,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring, filter: filters.time},
			validity_period: {type: types.cstring, filter: filters.time},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8, default: null},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.buffer, filter: filters.message}
		}
	},
	deliver_sm_resp: {
		id: 0x80000005,
		params: {
			message_id: {type: types.cstring}
		}
	},
	enquire_link: {
		id: 0x00000015
	},
	enquire_link_resp: {
		id: 0x80000015
	},
	generic_nack: {
		id: 0x80000000
	},
	outbind: {
		id: 0x0000000B,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring}
		}
	},
	query_broadcast_sm: {
		id: 0x00000112,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	query_broadcast_sm_resp: {
		id: 0x80000112,
		params: {
			message_id: {type: types.cstring}
		}
	},
	query_sm: {
		id: 0x00000003,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	query_sm_resp: {
		id: 0x80000003,
		params: {
			message_id: {type: types.cstring},
			final_date: {type: types.cstring, filter: filters.time},
			message_state: {type: types.int8},
			error_code: {type: types.int8}
		}
	},
	replace_sm: {
		id: 0x00000007,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			schedule_delivery_time: {type: types.cstring, filter: filters.time},
			validity_period: {type: types.cstring, filter: filters.time},
			registered_delivery: {type: types.int8},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.buffer, filter: filters.message}
		}
	},
	replace_sm_resp: {
		id: 0x80000007
	},
	submit_multi: {
		id: 0x00000021,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			//number_of_dests: {type: types.int8},
			dest_address: {type: types.dest_address_array},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring, filter: filters.time},
			validity_period: {type: types.cstring, filter: filters.time},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8, default: null},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.buffer, filter: filters.message}
		}
	},
	submit_multi_resp: {
		id: 0x80000021,
		params: {
			message_id: {type: types.cstring},
			//no_unsuccess: {type: types.int8},
			unsuccess_sme: {type: types.unsuccess_sme_array}
		}
	},
	submit_sm: {
		id: 0x00000004,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring, filter: filters.time},
			validity_period: {type: types.cstring, filter: filters.time},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8, default: null},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.buffer, filter: filters.message}
		}
	},
	submit_sm_resp: {
		id: 0x80000004,
		params: {
			message_id: {type: types.cstring}
		}
	},
	unbind: {
		id: 0x00000006
	},
	unbind_resp: {
		id: 0x80000006
	}
};

var commandsById = {};

for (var command in commands) {
	commandsById[commands[command].id] = commands[command];
	commands[command].command = command;
}

var consts = {
	REGISTERED_DELIVERY: {
		FINAL:                    0x01,
		FAILURE:                  0x02,
		SUCCESS:                  0x03,
		DELIVERY_ACKNOWLEDGEMENT: 0x04,
		USER_ACKNOWLEDGEMENT:     0x08,
		INTERMEDIATE:             0x10
	},
	ESM_CLASS: {
		DATAGRAM:                 0x01,
		FORWARD:                  0x02,
		STORE_FORWARD:            0x03,
		MC_DELIVERY_RECEIPT:      0x04,
		DELIVERY_ACKNOWLEDGEMENT: 0x08,
		USER_ACKNOWLEDGEMENT:     0x10,
		CONVERSATION_ABORT:       0x18,
		INTERMEDIATE_DELIVERY:    0x20,
		UDH_INDICATOR:            0x40,
		KANNEL_UDH_INDICATOR:     0x43,
		SET_REPLY_PATH:           0x80
	},
	MESSAGE_STATE: {
		SCHEDULED:     0,
		ENROUTE:       1,
		DELIVERED:     2,
		EXPIRED:       3,
		DELETED:       4,
		UNDELIVERABLE: 5,
		ACCEPTED:      6,
		UNKNOWN:       7,
		REJECTED:      8,
		SKIPPED:       9
	},
	TON: {
		UNKNOWN:           0x00,
		INTERNATIONAL:     0x01,
		NATIONAL:          0x02,
		NETWORK_SPECIFIC:  0x03,
		SUBSCRIBER_NUMBER: 0x04,
		ALPHANUMERIC:      0x05,
		ABBREVIATED:       0x06
	},
	NPI: {
		UNKNOWN:     0x00,
		ISDN:        0x01,
		DATA:        0x03,
		TELEX:       0x04,
		LAND_MOBILE: 0x06,
		NATIONAL:    0x08,
		PRIVATE:     0x09,
		ERMES:       0x0A,
		INTERNET:    0x0E,
		IP:          0x0E,
		WAP:         0x12
	},
	ENCODING: {
		SMSC_DEFAULT:       0x00,
		ASCII:              0x01,
		GSM_TR:             0x01,
		GSM_ES:             0x01,
		GSM_PT:             0x01,
		IA5:                0x01,
		LATIN1:             0x03,
		ISO_8859_1:         0x03,
		BINARY:             0x04,
		JIS:                0x05,
		X_0208_1990:        0x05,
		CYRILLIC:           0x06,
		ISO_8859_5:         0x06,
		HEBREW:             0x07,
		ISO_8859_8:         0x07,
		UCS2:               0x08,
		PICTOGRAM:          0x09,
		ISO_2022_JP:        0x0A,
		EXTENDED_KANJI_JIS: 0x0D,
		X_0212_1990:        0x0D,
		KS_C_5601:          0x0E
	},
	NETWORK: {
		GENERIC: 0x00,
		GSM:     0x01,
		TDMA:    0x02,
		CDMA:    0x03
	},
	BROADCAST_AREA_FORMAT: {
		NAME:          0x00,
		ALIAS:         0x00,
		ELLIPSOID_ARC: 0x01,
		POLYGON:       0x02
	},
	BROADCAST_FREQUENCY_INTERVAL: {
		MAX_POSSIBLE: 0x00,
		SECONDS:      0x08,
		MINUTES:      0x09,
		HOURS:        0x0A,
		DAYS:         0x0B,
		WEEKS:        0x0C,
		MONTHS:       0x0D,
		YEARS:        0x0E
	}
};

exports.errors = {
	ESME_ROK:                 0x0000,
	ESME_RINVMSGLEN:          0x0001,
	ESME_RINVCMDLEN:          0x0002,
	ESME_RINVCMDID:           0x0003,
	ESME_RINVBNDSTS:          0x0004,
	ESME_RALYBND:             0x0005,
	ESME_RINVPRTFLG:          0x0006,
	ESME_RINVREGDLVFLG:       0x0007,
	ESME_RSYSERR:             0x0008,
	ESME_RINVSRCADR:          0x000A,
	ESME_RINVDSTADR:          0x000B,
	ESME_RINVMSGID:           0x000C,
	ESME_RBINDFAIL:           0x000D,
	ESME_RINVPASWD:           0x000E,
	ESME_RINVSYSID:           0x000F,
	ESME_RCANCELFAIL:         0x0011,
	ESME_RREPLACEFAIL:        0x0013,
	ESME_RMSGQFUL:            0x0014,
	ESME_RINVSERTYP:          0x0015,
	ESME_RINVNUMDESTS:        0x0033,
	ESME_RINVDLNAME:          0x0034,
	ESME_RINVDESTFLAG:        0x0040,
	ESME_RINVSUBREP:          0x0042,
	ESME_RINVESMCLASS:        0x0043,
	ESME_RCNTSUBDL:           0x0044,
	ESME_RSUBMITFAIL:         0x0045,
	ESME_RINVSRCTON:          0x0048,
	ESME_RINVSRCNPI:          0x0049,
	ESME_RINVDSTTON:          0x0050,
	ESME_RINVDSTNPI:          0x0051,
	ESME_RINVSYSTYP:          0x0053,
	ESME_RINVREPFLAG:         0x0054,
	ESME_RINVNUMMSGS:         0x0055,
	ESME_RTHROTTLED:          0x0058,
	ESME_RINVSCHED:           0x0061,
	ESME_RINVEXPIRY:          0x0062,
	ESME_RINVDFTMSGID:        0x0063,
	ESME_RX_T_APPN:           0x0064,
	ESME_RX_P_APPN:           0x0065,
	ESME_RX_R_APPN:           0x0066,
	ESME_RQUERYFAIL:          0x0067,
	ESME_RINVTLVSTREAM:       0x00C0,
	ESME_RTLVNOTALLWD:        0x00C1,
	ESME_RINVTLVLEN:          0x00C2,
	ESME_RMISSINGTLV:         0x00C3,
	ESME_RINVTLVVAL:          0x00C4,
	ESME_RDELIVERYFAILURE:    0x00FE,
	ESME_RUNKNOWNERR:         0x00FF,
	ESME_RSERTYPUNAUTH:       0x0100,
	ESME_RPROHIBITED:         0x0101,
	ESME_RSERTYPUNAVAIL:      0x0102,
	ESME_RSERTYPDENIED:       0x0103,
	ESME_RINVDCS:             0x0104,
	ESME_RINVSRCADDRSUBUNIT:  0x0105,
	ESME_RINVDSTADDRSUBUNIT:  0x0106,
	ESME_RINVBCASTFREQINT:    0x0107,
	ESME_RINVBCASTALIAS_NAME: 0x0108,
	ESME_RINVBCASTAREAFMT:    0x0109,
	ESME_RINVNUMBCAST_AREAS:  0x010A,
	ESME_RINVBCASTCNTTYPE:    0x010B,
	ESME_RINVBCASTMSGCLASS:   0x010C,
	ESME_RBCASTFAIL:          0x010D,
	ESME_RBCASTQUERYFAIL:     0x010E,
	ESME_RBCASTCANCELFAIL:    0x010F,
	ESME_RINVBCAST_REP:       0x0110,
	ESME_RINVBCASTSRVGRP:     0x0111,
	ESME_RINVBCASTCHANIND:    0x0112
};

exports.encodings = encodings;
exports.filters = filters;
exports.gsmCoder = gsmCoder;
exports.consts = consts;
exports.commands = commands;
exports.commandsById = commandsById;
exports.types = types;
exports.tlvs = tlvs;
exports.tlvsById = tlvsById;
