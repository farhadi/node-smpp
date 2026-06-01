var assert = require('assert'),
	filters = require('../lib/defs').filters,
	Buffer = require('safer-buffer').Buffer;

describe('time', function() {
	var pdu = {};
	var value = new Date('2012-03-05 12:43:50 UTC');
	var encoded = '120305124350000+';
	var value2 = '020630';
	var encoded2 = '000000020630000R';
	describe('#encode()', function() {
		it('should convert a JavaScript Date object to SMPP absolute time format', function() {
			assert.equal(filters.time.encode.call(pdu, value), encoded);
		});
		it('should convert given string to SMPP relative time format', function() {
			assert.equal(filters.time.encode.call(pdu, value2), encoded2);
		});
	});
	describe('#decode()', function() {
		it('should convert an SMPP absolute time to JavaScript Date object', function() {
			assert.deepEqual(filters.time.decode.call(pdu, encoded), value);
		});
		it('should convert an SMPP relative time to JavaScript Date object', function() {
			var expected = new Date(Date.now() + 2 * 3600000 + 6 * 60000 + 30 * 1000).setMilliseconds(0);
			expected = new Date(expected);
			var actual = filters.time.decode.call(pdu, encoded2).setMilliseconds(0);
			actual = new Date(actual);
			assert.deepEqual(actual, expected);
		});
	});
});

describe('message GSM', function() {
	var pdu = {
		data_coding: 0
	};
	var value = 'This is a Test';
	var value0 = true;
	var value1 = 3.145;
	var value2 = {message: value};
	var value3 = {message: Buffer.from(value)};
	var encoded = Buffer.from(value);
	var encoded0 = Buffer.from(String(value0));
	var encoded1 = Buffer.from(String(value1));
	describe('#encode()', function() {
		it('should encode a high-level formatted short message to a low-level buffer', function() {
			assert.deepEqual(filters.message.encode.call(pdu, value), encoded);
			assert.deepEqual(filters.message.encode.call(pdu, value0), encoded0);
			assert.deepEqual(filters.message.encode.call(pdu, value1), encoded1);
			assert.deepEqual(filters.message.encode.call(pdu, value2), encoded);
			assert.deepEqual(filters.message.encode.call(pdu, value3), encoded);
		});
	});
	describe('#decode()', function() {
		it('should convert a short message buffer to an object containing message and optional udh', function() {
			assert.deepEqual(filters.message.decode.call(pdu, encoded), value2);
		});
	});
});

describe('message GSM_TR', function() {
	var udh = Buffer.from([0x03, 0x24, 0x01, 0x01]);
	var value = {
		udh: udh,
		message: 'This is a Teşt'
	};
	var encoded = Buffer.concat([udh, Buffer.from([0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x54, 0x65, 0x1D, 0x74])]);

	var encodePdu = {
		data_coding: 0
	};
	describe('#encode()', function() {
		it('should encode a high-level formatted short message to a low-level buffer', function() {
			assert.deepEqual(filters.message.encode.call(encodePdu, value), encoded);
		});
	});
	var decodePdu = {
		data_coding: 0,
		esm_class: 0x40
	};
	var decodeValue = {
		udh: [udh.slice(1)],
		message: 'This is a Teşt'
	};
	describe('#decode()', function() {
		it('should convert a short message buffer to an object containing message and optional udh', function() {
			assert.deepEqual(filters.message.decode.call(decodePdu, encoded), decodeValue);
		});
	});
});

describe('message GSM_ES', function() {
	var udh = Buffer.from([0x03, 0x25, 0x01, 0x02]);
	var value = {
		udh: udh,
		message: 'This ís a Tést'
	};
	var encoded = Buffer.concat([udh, Buffer.from([0x54, 0x68, 0x69, 0x73, 0x20, 0x1B, 0x69, 0x73, 0x20, 0x61, 0x20, 0x54, 0x05, 0x73, 0x74])]);

	var encodePdu = {
		data_coding: 0
	};
	describe('#encode()', function() {
		it('should encode a high-level formatted short message to a low-level buffer', function() {
			assert.deepEqual(filters.message.encode.call(encodePdu, value), encoded);
		});
	});

	var decodePdu = {
		data_coding: 0,
		esm_class: 0x40
	};
	var decodeValue = {
		udh: [udh.slice(1)],
		message: 'This ís a Tést'
	};
	describe('#decode()', function() {
		it('should convert a short message buffer to an object containing message and optional udh', function() {
			assert.deepEqual(filters.message.decode.call(decodePdu, encoded), decodeValue);
		});
	});
});

describe('message GSM_PT', function() {
	var udh = Buffer.from([0x03, 0x25, 0x01, 0x03]);
	var value = {
		udh: udh,
		message: 'This is â TΣst'
	};
	var encoded = Buffer.concat([udh, Buffer.from([0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x1D, 0x20, 0x54, 0x1B, 0x18, 0x73, 0x74])]);

	var encodePdu = {
		data_coding: 0
	};
	describe('#encode()', function() {
		it('should encode a high-level formatted short message to a low-level buffer', function() {
			assert.deepEqual(filters.message.encode.call(encodePdu, value), encoded);
		});
	});

	var decodePdu = {
		data_coding: 0,
		esm_class: 0x40
	};
	var decodeValue = {
		udh: [udh.slice(1)],
		message: 'This is â TΣst'
	};
	describe('#decode()', function() {
		it('should convert a short message buffer to an object containing message and optional udh', function() {
			assert.deepEqual(filters.message.decode.call(decodePdu, encoded), decodeValue);
		});
	});
});
