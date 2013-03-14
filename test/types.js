var assert = require('assert'),
    defs = require('../lib/defs'),
    types = defs.types;

suite('int8', function() {
	var b = new Buffer([0, 0x65]), expected = 0x65;
	test('read()', function() {
		var result = types.int8.read(b, 1);
		assert.equal(result, expected);
	});
	test('size()', function() {
		assert.equal(types.int8.size(expected), 1);
	});
	test('write()', function() {
		types.int8.write(expected, b, 0);
		assert.deepEqual(new Buffer([0x65]), b.slice(0, 1));
	});
});

suite('int16', function() {
	var b = new Buffer([0, 0x05, 0x65]), expected = 0x0565;
	test('read()', function() {
		var result = types.int16.read(b, 1);
		assert.equal(result, expected);
	});
	test('size()', function() {
		assert.equal(types.int16.size(expected), 2);
	});
	test('write()', function() {
		types.int16.write(expected, b, 0);
		assert.deepEqual(new Buffer([0x05, 0x65]), b.slice(0, 2));
	});
});

suite('int32', function() {
	var b = new Buffer([0, 0x10, 0x02, 0x40, 0x45]), expected = 0x10024045;
	test('read()', function() {
		var result = types.int32.read(b, 1);
		assert.equal(result, expected);
	});
	test('size()', function() {
		assert.equal(types.int32.size(expected), 4);
	});
	test('write()', function() {
		types.int32.write(expected, b, 0);
		assert.deepEqual(new Buffer([0x10, 0x02, 0x40, 0x45]), b.slice(0, 4));
	});
});

suite('string', function() {
	var b = new Buffer(9), expected = 'abcd1234';
	b[0] = 8;
	b.write(expected, 1);
	test('read()', function() {
		var result = types.string.read(b, 0);
		assert.equal(result, expected);
	});
	test('size()', function() {
		assert.equal(9, types.string.size(expected));
	});
	test('write()', function() {
		var b2 = new Buffer(9);
		types.string.write(expected, b2, 0);
		assert.deepEqual(b, b2);
	});
});

suite('cstring', function() {
	var b = new Buffer(9), expected = 'abcd1234';
	b[8] = 0;
	b.write(expected, 0);
	test('read()', function() {
		var result = types.cstring.read(b, 0);
		assert.equal(result, expected);
	});
	test('size()', function() {
		assert.equal(9, types.cstring.size(expected));
	});
	test('write()', function() {
		var b2 = new Buffer(9);
		types.cstring.write(expected, b2, 0);
		assert.deepEqual(b, b2);
	});
});

suite('dest_address_array', function() {
	var b = new Buffer([
		0x02, 0x01, 0x01, 0x02, 0x31, 0x32, 0x33, 0x00,
		0x02, 0x61, 0x62, 0x63, 0x00
	]);
	var expected = [
		{
			dest_addr_ton: 1,
			dest_addr_npi: 2,
			destination_addr: '123'
		},
		{ dl_name: 'abc' }
	];
	test('read()', function() {
		var result = types.dest_address_array.read(b, 0);
		assert.deepEqual(result, expected);
	});
	test('size()', function() {
		assert.equal(types.dest_address_array.size(expected), 13);
	});
	test('write()', function() {
		var b2 = new Buffer(13);
		types.dest_address_array.write(expected, b2, 0);
		assert.deepEqual(b, b2);
	});
});

suite('unsuccess_sme_array', function() {
	var b = new Buffer([
		0x02, 0x03, 0x04, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00, 0x00, 0x07,
		0x05, 0x06, 0x31, 0x32, 0x33, 0x00, 0x10, 0x00, 0x00, 0x08
	]);
	var expected = [
		{
			dest_addr_ton: 3,
			dest_addr_npi: 4,
			destination_addr: 'abc',
			error_status_code: 0x00000007
		},
		{
			dest_addr_ton: 5,
			dest_addr_npi: 6,
			destination_addr: '123',
			error_status_code: 0x10000008
		}
	];
	test('read()', function() {
		var result = types.unsuccess_sme_array.read(b, 0);
		assert.deepEqual(result, expected);
	});
	test('size()', function() {
		assert.equal(types.unsuccess_sme_array.size(expected), 21);
	});
	test('write()', function() {
		var b2 = new Buffer(21);
		types.unsuccess_sme_array.write(expected, b2, 0);
		assert.deepEqual(b, b2);
	});
});
