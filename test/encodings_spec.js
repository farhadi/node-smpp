var expect    = require("chai").expect;
var encodings = require("../lib/defs").encodings;

describe("The character encoders", function () {
	describe("GSM8 (GSM03.38 8-bit)", function () {
		var gsm8 = "The \0 symbol is different.";
		var utf8 = "The @ symbol is different.";

		it("can detect GSM8 compatible messages", function () {
			expect(encodings.GSM8.match("a simple message"), "failed to match GSM").to.be.true;
		});

		it("can detect GSM8 incompatible messages", function () {
			expect(encodings.GSM8.match("a ` character is not supported by GSM8"), "matched GSM").to.be.false;
		});

		it("can encode UTF-8 messages", function () {
			var result = encodings.GSM8.encode(utf8);

			expect(Buffer.isBuffer(result), "result is not a buffer").to.be.true;
			expect(result.toString("utf8"), "incorrect encoding").to.equal(gsm8);
		});

		it("can decode messages to UTF-8", function () {
			expect(encodings.GSM8.decode(gsm8), "incorrect decoding").to.equal(utf8);
		});
	});
});
