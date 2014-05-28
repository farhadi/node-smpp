var smppPDU = require("../lib/pdu");
var defs = require("../lib/defs");
var expect = require("chai").expect;
var sinon  = require("sinon");

describe("A SMPP-PDU", function () {

	describe("checks work of constructor PDU", function () {
		var deliverSm;
		var newDeliverSm;

		before(function () {
			deliverSm = new smppPDU.PDU("deliver_sm");
			deliverSm.short_message.message = "Hello";
			newDeliverSm = new smppPDU.PDU("deliver_sm");
		});

		it("does not have shared global object in every PDU", function () {
			expect(deliverSm.short_message, "short_message is shared between PDUs").to.not.deep.equal(newDeliverSm.short_message);
		});
	});

	describe("checks whether pdu is a Delivery Acknowledgement", function () {
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

		it("(deliver_sm)", function () {
			expect(deliverSm.isDeliveryAcknowledgement(), "good pdu didn't pass").to.be.true;
			expect(deliverSm_noEsmClass.isDeliveryAcknowledgement(), "true without 'esm_class'").to.be.false;
		});

		it("(data_sm)", function () {
			expect(dataSm.isDeliveryAcknowledgement(), "good pdu didn't pass").to.be.true;
			expect(dataSm_noEsmClass.isDeliveryAcknowledgement(), "true without 'esm_class'").to.be.false;
		});

		it("(submit_sm)", function () {
			expect(submitSm.isDeliveryAcknowledgement(), "'submit_sm' can be a delivery").to.be.false;
		});
	});

	describe("creates a Delivery Acknowledgement with default configuration", function () {
		// 7001010000 - January 1st 1970, 0:00:00 am
		var defaultMessage = "id: sub:001 dlvrd:001 submit date:7001010000 done date:7001010000 stat:UNKNOWN err:000 text:none";

		var deliverSm;
		var dataSm;
		var clock;

		before(function () {
			clock     = sinon.useFakeTimers();
			deliverSm = new smppPDU.PDU("deliver_sm");
			dataSm    = new smppPDU.PDU("data_sm");
			submitSm = new smppPDU.PDU("submit_sm");

			smppPDU.createDeliveryAcknowledgement(deliverSm);
			smppPDU.createDeliveryAcknowledgement(dataSm);
			smppPDU.createDeliveryAcknowledgement(submitSm);
		});

		after(function () {
			clock.restore();
		});

		it("field 'esm_class' has established flag for 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.esm_class, "no flag 'esm_class' in 'deliver_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
			expect(dataSm.esm_class, "no flag 'esm_class' in 'data_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
		});

		it("no established flag in the 'esm_class' in 'submit_sm'", function () {
			expect(submitSm.esm_class, "flag 'esm_class' is set").to.be.equal(0);
		});

		it("with user data of Delivery Acknowledgement in 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.short_message.message, "no data in the 'short_message'").to.be.equal(defaultMessage);
			expect(dataSm.message_payload, "no data in the 'message_payload'").to.be.equal(defaultMessage);
		});

		it("without user data of Delivery Acknowledgement in 'submit_sm'", function () {
			expect(submitSm.short_message.message, "has message in the 'short_message'").to.be.undefined;
		});

	});

	describe("creates a Delivery Acknowledgement with specified configuration", function () {

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
			submitSm = new smppPDU.PDU("submit_sm");

			smppPDU.createDeliveryAcknowledgement(deliverSm, options);
			smppPDU.createDeliveryAcknowledgement(dataSm, options);
			smppPDU.createDeliveryAcknowledgement(submitSm);
		});

		it("'esm_class' should be set in 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.esm_class, "no flag 'esm_class' in 'deliver_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
			expect(dataSm.esm_class, "no flag 'esm_class' in 'data_sm'").to.be.equal(defs.consts.ESM_CLASS.DELIVERY_ACKNOWLEDGEMENT);
		});

		it("'esm_class' should be not set in 'submit_sm'", function () {
			expect(submitSm.esm_class, "flag 'Delivery Acknowledgement' is set").to.be.equal(0);
		});

		it("with user data of Delivery Acknowledgement in 'deliver_sm' and 'data_sm'", function () {
			expect(deliverSm.short_message.message, "no data in the 'short_message'").to.be.equal(textMessage);
			expect(dataSm.message_payload, "no data in the 'message_payload'").to.be.equal(textMessage);
		});

		it("without user data of Delivery Acknowledgement in 'submit_sm'", function () {
			expect(submitSm.short_message.message, "has message in the 'short_message'").to.be.undefined;
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
			dlrSubmitSm  = smppPDU.getDataDeliveryAcknowledgement(submitSm);
		});

		it("return correct data", function () {
			expect(dlrDeliverSm, "fail for 'deliver_sm'").to.deep.equal(options);
			expect(dlrDataSm, "fail for 'data_sm'").to.deep.equal(options);
			expect(dlrSubmitSm, "fail for 'submit_sm'").to.be.null;
		});
	});
});