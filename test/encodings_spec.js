var expect    = require("chai").expect;
var encodings = require("../lib/defs").encodings;

describe("The character encoders", function () {
	describe("ASCII", function () {
		it("can detect ASCII compatible messages", function () {
			expect(encodings.ASCII.match("this message is ASCII"), "failed to match ASCII").to.be.true;
		});

		it("can detect ASCII incompatible messages", function () {
			expect(encodings.ASCII.match("\u20ac"), "matched ASCII").to.be.false;
		});

		it("can encode UTF-8 messages", function () {
			expect(encodings.ASCII.encode("A message.").toString("ascii"), "bad encoding").to.equal("A message.");
		});

		it("can decode UTF-8 messages", function () {
			expect(encodings.ASCII.decode(new Buffer("A message.", "ascii")), "bad decoding").to.equal("A message.");
		});
	});

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

describe("The encoding detector", function () {
	it("can match a GSM8 message", function () {
		expect(encodings.detect("This is GSM"), "GSM").to.equal("GSM8");
	});

	it("can match an ASCII message", function () {
		expect(encodings.detect("GSM has no `"), "ASCII").to.equal("ASCII");
	});
});
