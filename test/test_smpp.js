var smpp = require("../lib/smpp");
var expect = require("chai").expect;

describe("function addTLV", function () {
	it("add TLV-field to the array with TLVs", function () {
		var testTag = "some_tag";
		var testOptions = {
			id   : 0x12345,
			type : "some_type",
		};
		smpp.addTLV(testTag, testOptions);
		expect(testOptions["tag"]).to.equal(testTag);
		expect(smpp.tlvs[testTag]).to.deep.equal(testOptions);
		expect(smpp.tlvsById[testOptions.id]).to.deep.equal(testOptions);
	});

	it("add TLV-field to pdu", function () {
		var testTag = "tag_test";
		var testOptions = {
			id   : 0xfffff,
			type : smpp.types.tlv.string
		};
		smpp.addTLV(testTag, testOptions);
		var optionPDU = {};
		var testValue = "tag_value";
		optionPDU[testTag] = testValue;
		var pdu = new smpp.PDU("data_sm", optionPDU);
		expect(pdu[testTag]).to.equal(testValue);
	});
});