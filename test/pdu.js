var assert = require('assert'),
    stream = require('stream'),
    PDU = require('../lib/pdu').PDU,
    utils = require('../lib/utils');

describe('PDU', function() {
	var buffer, expected;

	beforeEach(function() {
		buffer = utils.Buffer('0000003b000000040000000000000002' +
			'00010034363730313133333131310001013436373039373' +
			'731333337000000000000000001000474657374', 'hex');
		expected = {
			command_length: 59,
			command_id: 4,
			command_status: 0,
			sequence_number: 2,
			command: 'submit_sm',
			service_type: '',
			source_addr_ton: 1,
			source_addr_npi: 0,
			source_addr: '46701133111',
			dest_addr_ton: 1,
			dest_addr_npi: 1,
			destination_addr: '46709771337',
			esm_class: 0,
			protocol_id: 0,
			priority_flag: 0,
			schedule_delivery_time: '',
			validity_period: '',
			registered_delivery: 0,
			replace_if_present_flag: 0,
			data_coding: 1,
			sm_default_msg_id: 0,
			short_message: { message: 'test' }
		};
	});

	describe('#construct', function() {
		it('should construct a pdu from buffer', function() {
			var pdu = new PDU(buffer);
			assert.equal(buffer.length, pdu.command_length);
			assert.deepEqual(pdu, expected);
		});

		it('should extract tlv parameters if available', function() {
			var b = Buffer.concat([buffer, utils.Buffer('0424000474657374', 'hex')]);
			b[3] = 67;
			expected.command_length = 67;
			expected.message_payload = { message: 'test' };
			var pdu = new PDU(b);
			assert.deepEqual(pdu, expected);
		});

		it('should not fail with a malformed pdu', function() {
			var b = Buffer.concat([buffer, utils.Buffer([0])]);
			b[3] = 0x3c;
			expected.command_length = 60;
			var pdu = new PDU(b);
			assert.deepEqual(pdu, expected);
		});

		it('should throw error when PDU length is larger than PDU.maxLength', function() {
			buffer[0] = 1;
			assert.throws(function() {
				var pdu = new PDU(buffer);
			}, /PDU length was too large/);
		});
	});

	describe('#fromStream()', function() {
		it('should extract pdu from stream', function() {
			var readable = new stream.Readable();
			readable._read = function() {} ;
			readable.push(buffer);
			var pdu = PDU.fromStream(readable);
			assert.deepEqual(pdu, expected);
		});
	});

	describe('#fromBuffer()', function() {
		it('should return false if buffer size is less than PDU length', function() {
			var b = buffer.slice(0, buffer.length - 1);
			var pdu = PDU.fromBuffer(b);
			assert(!pdu);
		});
	});

	describe('#toBuffer()', function() {
		it('should create a buffer from a PDU object', function() {
			var submit_sm = {
				sequence_number: 2,
				source_addr_ton: 1,
				source_addr: '46701133111',
				dest_addr_ton: 1,
				dest_addr_npi: 1,
				destination_addr: '46709771337',
				short_message: 'test'
			};
			var pdu = new PDU('submit_sm', submit_sm);
			assert.deepEqual(pdu.toBuffer(), buffer);

			submit_sm.data_coding = 0;
			buffer[52] = 0;
			var pdu = new PDU('submit_sm', submit_sm);
			assert.deepEqual(pdu.toBuffer(), buffer);
		});
	});

	describe('#response()', function() {
		it('should generate a response pdu from the given pdu', function() {
			var pdu = new PDU(buffer);
			var response = pdu.response({ message_id: '123456' });
			assert.equal(response.command, 'submit_sm_resp');
			assert.equal(response.message_id, '123456');
			assert.equal(response.sequence_number, 2);
		});
	});
});
