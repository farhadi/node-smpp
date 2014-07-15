var smppPDU = require("../lib/pdu");
var defs = require("../lib/defs");
var expect = require("chai").expect;
var sinon  = require("sinon");

describe("A SMPP PDU", function () {

	describe("checks work of constructor PDU", function () {
		var deliverSm;
		var newDeliverSm;

		before(function () {
			deliverSm = new smppPDU.PDU("deliver_sm");
			newDeliverSm = new smppPDU.PDU("deliver_sm");
		});

		it("does not have shared global object in every PDU", function () {
			expect(deliverSm.short_message, "short_message is shared between PDUs").not.to.equal(newDeliverSm.short_message);
		});
	});

	describe("command can detect a delivery acknowledgment payload", function () {
		var deliverSm;
		var deliverSm_noEsmClass;
		var dataSm;
		var dataSm_noEsmClass;
		var submitSm;

		before(function () {
			deliverSm = new smppPDU.PDU("deliver_sm", { esm_class : defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT });
			deliverSm_noEsmClass = new smppPDU.PDU("deliver_sm");
			dataSm = new smppPDU.PDU("data_sm", { esm_class : defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT });
			dataSm_noEsmClass = new smppPDU.PDU("data_sm");
			submitSm = new smppPDU.PDU("submit_sm", { esm_class : defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT });
		});

		it("with the 'deliver_sm'", function () {
			expect(deliverSm.isDeliveryAcknowledgement(), "should be delivery acknowledgment").to.be.true;
			expect(deliverSm_noEsmClass.isDeliveryAcknowledgement(), "flag in the 'esm_class' is not set").to.be.false;
		});

		it("with the 'data_sm'", function () {
			expect(dataSm.isDeliveryAcknowledgement(), "should be delivery acknowledgment").to.be.true;
			expect(dataSm_noEsmClass.isDeliveryAcknowledgement(), "flag in the 'esm_class' is not set").to.be.false;
		});

		it("with the 'submit_sm'", function () {
			expect(submitSm.isDeliveryAcknowledgement(), "'submit_sm' can be a delivery").to.be.false;
		});
	});

	describe("creates a Delivery Acknowledgement for 'deliver_sm' and 'data_sm' commands", function () {

		var deliverSm;
		var dataSm;
		var textMessage = "id:12345-54321 sub:004 dlvrd:004 submit date:1405230303 done date:1405230303 stat:ACCEPTD err:999 text:test";
		var options = {
			id         : "12345-54321",
			sub        : "004",
			dlvrd      : "004",
			submitDate : "1405230303",
			doneDate   : "1405230303",
			status     : "ACCEPTD",
			error      : "999",
			text       : "test"
		};

		before(function () {
			deliverSm = new smppPDU.PDU("deliver_sm");
			dataSm = new smppPDU.PDU("data_sm");

			smppPDU.createDeliveryAcknowledgement(deliverSm, options);
			smppPDU.createDeliveryAcknowledgement(dataSm, options);
		});

		it("'esm_class' should be set in 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.esm_class, "no flag 'esm_class' in 'deliver_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
			expect(dataSm.esm_class, "no flag 'esm_class' in 'data_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
		});

		it("with user data of Delivery Acknowledgement in 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.short_message, "no data in the 'short_message'").to.be.equal(textMessage);
			expect(dataSm.message_payload, "no data in the 'message_payload'").to.be.equal(textMessage);
		});
	});

	describe("throws error while create delivery acknowledgment for unsuitable commands", function () {
		var submitSm;

		before(function () {
			submitSm = new smppPDU.PDU("submit_sm");
		});

		it("try to create delivery for 'submit_sm' command", function () {
			try {
				smppPDU.createDeliveryAcknowledgement(submitSm);
				throw new Error("creates delivery acknowledgment for 'submit_sm' command");
			}
			catch (error) {
				expect(error).to.be.an.instanceOf(Error);
				expect(error.message).to.contain("Cannot create delivery acknowledgement");
			}
		});
		
	});

	describe("parses message user data of Delivery Acknowledgement", function () {
		var options = {
			id         : "12345-54321",
			sub        : "004",
			dlvrd      : "004",
			submitDate : "1405230303",
			doneDate   : "1405230303",
			status     : "ACCEPTD",
			error      : "999",
			text       : "test"
		};
		var userData = "id:12345-54321 sub:004 dlvrd:004 submit date:1405230303 done date:1405230303 stat:ACCEPTD err:999 text:test";
		var deliverSm;
		var submitSm;
		var dataSm;
		var dlrDeliverSm;
		var dlrDataSm;
		var dlrSubmitSm;
		var errorSubmitSm;

		before(function () {
			deliverSm = new smppPDU.PDU("deliver_sm", {
				esm_class : defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT,
				short_message : { message : userData }
			});
			dataSm = new smppPDU.PDU("data_sm", {
				esm_class : defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT,
				message_payload : userData
			});
			submitSm = new smppPDU.PDU("submit_sm", {
				short_message : { message : userData }
			});

			dlrDeliverSm = smppPDU.getDataDeliveryAcknowledgement(deliverSm);
			dlrDataSm    = smppPDU.getDataDeliveryAcknowledgement(dataSm);
			try {
				dlrSubmitSm  = smppPDU.getDataDeliveryAcknowledgement(submitSm);
			}
			catch (error) {
				errorSubmitSm = error;
			}
		});

		it("return correct data", function () {
			expect(dlrDeliverSm, "fail for 'deliver_sm'").to.deep.equal(options);
			expect(dlrDataSm, "fail for 'data_sm'").to.deep.equal(options);
			expect(dlrSubmitSm, "pdu with 'submit_sm' command cannot be delivery").to.be.undefined;
			expect(errorSubmitSm).to.be.an.instanceOf(Error);
			expect(errorSubmitSm.message).to.contain("Cannot get payload for pdu that is not delivery acknowledgement");
		});
	});

	describe("with no 'short_message' field", function () {
		var pdu;

		before(function () {
			pdu = new smppPDU.PDU("submit_sm", {});
		});

		it("uses an empty buffer as the default value", function () {
			expect(Buffer.isBuffer(pdu.short_message), "value is not a buffer").to.be.true;
			expect(pdu.short_message, "non-zero length").to.have.length(0);
		});
	});
});
