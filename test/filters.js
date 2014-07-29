var assert = require('assert'),
    filters = require('../lib/defs').filters;

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
			var expected = new Date(Date.now() + 2 * 3600000 + 6 * 60000 + 30 * 1000);
			assert.deepEqual(filters.time.decode.call(pdu, encoded2), expected);
		});
	});
});

describe('message', function() {
	var pdu = {
		data_coding: 0
	};
	var value = 'This is a Test';
	var value2 = {message: 'This is a Test'};
	var value3 = {message: new Buffer('This is a Test')};
	var encoded = new Buffer(value);
	describe('#encode()', function() {
		it('should encode a high-level formatted short message to a low-level buffer', function() {
			assert.deepEqual(filters.message.encode.call(pdu, value), encoded);
			assert.deepEqual(filters.message.encode.call(pdu, value2), encoded);
			assert.deepEqual(filters.message.encode.call(pdu, value3), encoded);
		});
	});
	describe('#decode()', function() {
		it('should convert a short message buffer to an object contaning message and optional udh', function() {
			assert.deepEqual(filters.message.decode.call(pdu, encoded), value2);
		});
	});
});
