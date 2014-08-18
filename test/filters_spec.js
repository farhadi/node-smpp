var expect  = require("chai").expect;
var filters = require("../lib/defs").filters;

describe("The data type filter", function () {
	describe("for messages", function () {
		var ascii = "GSM has no `";
		var utf8  = "The @ symbol is different.";
		var gsm8  = "The \0 symbol is different.";

		it("encodes messages with GSM8 by default", function () {
			var pdu     = {};
			var encoded = filters.message.encode.call(pdu, utf8).toString("utf8");

			expect(encoded, "bad message encoding").to.equal(gsm8);
			expect(pdu, "bad data_coding field").to.have.property("data_coding", 0x00);
		});

		it("decodes messages with GSM8 by default", function () {
			var decoded = filters.message.decode.call({}, new Buffer(gsm8));

			expect(decoded, "bad message decoding").to.have.property("message", utf8);
		});

		it("will auto-detect non-GSM messages", function () {
			var pdu     = {};
			var encoded = filters.message.encode.call(pdu, ascii).toString("utf8");

			expect(encoded, "bad message encoding").to.equal(ascii);
			expect(pdu, "bad data_coding field").to.have.property("data_coding", 0x01);
		});
	});
});
