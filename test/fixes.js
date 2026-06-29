var assert = require('assert'),
	smpp = require('..'),
	PDU = require('../lib/pdu').PDU,
	Buffer = require('safer-buffer').Buffer;

describe('issue fixes', function () {

	describe('#229 / #256 - tolerant short_message encoding', function () {
		it('does not crash when short_message is a number', function () {
			var pdu = new PDU('submit_sm', { destination_addr: '12345', short_message: 123 });
			var buf;
			assert.doesNotThrow(function () { buf = pdu.toBuffer(); });
			assert.equal(new PDU(buf).short_message.message, '123');
		});

		it('does not crash when short_message is undefined', function () {
			var pdu = new PDU('submit_sm', { destination_addr: '12345' });
			pdu.short_message = undefined;
			assert.doesNotThrow(function () { pdu.toBuffer(); });
		});

		it('does not crash when short_message is null', function () {
			var pdu = new PDU('submit_sm', { destination_addr: '12345', short_message: null });
			assert.doesNotThrow(function () { pdu.toBuffer(); });
		});
	});

	describe('#66 / #252 - DCS-aware encoding detection on decode', function () {
		function decodeWith(data_coding, buffer) {
			return smpp.filters.message.decode.call({ data_coding: data_coding, esm_class: 0 }, buffer, false);
		}

		it('decodes UCS2 (data_coding 0x08)', function () {
			assert.equal(decodeWith(0x08, smpp.encodings.UCS2.encode('héllo')).message, 'héllo');
		});

		it('treats DCS 0xF8 as default alphabet, not UCS2 (low-nibble trap)', function () {
			assert.equal(decodeWith(0xF8, smpp.encodings.ASCII.encode('test')).message, 'test');
		});

		it('treats DCS 0xF4 as binary (returns raw buffer)', function () {
			var out = decodeWith(0xF4, Buffer.from([1, 2, 3])).message;
			assert.ok(Buffer.isBuffer(out));
			assert.deepEqual([].slice.call(out), [1, 2, 3]);
		});

		it('keeps low data_coding values working (0x00 => default ASCII)', function () {
			assert.equal(decodeWith(0x00, smpp.encodings.ASCII.encode('hi')).message, 'hi');
		});
	});

	describe('#231 - user-defined TLVs round-trip by numeric tag', function () {
		it('round-trips a custom TLV addressed by its numeric tag id', function () {
			var pdu = new PDU('submit_sm', { destination_addr: '12345', short_message: 'x' });
			pdu[0x3C02] = Buffer.from('TEST', 'ascii');
			var round = new PDU(pdu.toBuffer());
			assert.ok(Buffer.isBuffer(round[0x3C02]));
			assert.equal(round[0x3C02].toString('ascii'), 'TEST');
		});

		it('accepts a custom TLV passed via constructor options', function () {
			var pdu = new PDU('submit_sm', { destination_addr: '12345', short_message: 'x', 15362: Buffer.from('ALEX', 'ascii') });
			assert.equal(new PDU(pdu.toBuffer())[15362].toString('ascii'), 'ALEX');
		});
	});
});
