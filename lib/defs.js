var types = {
	int8: {
		read: function(buffer, offset) {
			return buffer.readUInt8(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt8(value, offset);
		},
		size: function() {
			return 1;
		},
		default: 0
	},
	int16: {
		read: function(buffer, offset) {
			return buffer.readUInt16BE(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt16BE(value, offset);
		},
		size: function() {
			return 2;
		},
		default: 0
	},
	int32: {
		read: function(buffer, offset) {
			return buffer.readUInt32BE(offset);
		},
		write: function(value, buffer, offset) {
			value = value || 0;
			buffer.writeUInt32BE(value, offset);
		},
		size: function() {
			return 4;
		},
		default: 0
	},
	string: {
		read: function(buffer, offset) {
			var length = buffer.readUInt8(offset++);
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			buffer.write(value, offset, 'ascii');
		},
		size: function(value) {
			return value.length + 1;
		},
		default: ''
	},
	cstring: {
		read: function(buffer, offset) {
			var length = 0;
			while (buffer[offset + length]) {
				length++;
			}
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			buffer.write(value, offset, 'ascii');
			buffer[offset + value.length] = 0;
		},
		size: function(value) {
			return value.length + 1;
		},
		default: ''
	},
	dest_address_array: {
		read: function(buffer, offset) {
			var dest_address, dest_flag, result = [];
			var number_of_dests = buffer.readUInt8(offset++);
			while (number_of_dests-- > 0) {
				dest_flag = buffer.readUInt8(offset++);
				if (dest_flag == 1) {
					dest_address = {
						dest_addr_ton: buffer.readUInt8(offset++),
						dest_addr_npi: buffer.readUInt8(offset++),
						destination_addr: types.cstring.read(buffer, offset)
					};
					offset += types.cstring.size(dest_address.destination_addr);
				} else {
					dest_address = {
						dl_name: types.cstring.read(buffer, offset)
					};
					offset += types.cstring.size(dest_address.dl_name);
				}
				result.push(dest_address);
			}
			return result;
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			value.forEach(function(dest_address) {
				if ('dl_name' in dest_address) {
					buffer.writeUInt8(2, offset++);
					types.cstring.write(dest_address.dl_name, buffer, offset);
					offset += types.cstring.size(dest_address.dl_name);
				} else {
					buffer.writeUInt8(1, offset++);
					buffer.writeUInt8(dest_address.dest_addr_ton, offset++);
					buffer.writeUInt8(dest_address.dest_addr_npi, offset++);
					types.cstring.write(dest_address.destination_addr, buffer, offset);
					offset += types.cstring.size(dest_address.destination_addr);
				}
			});
		},
		size: function(value) {
			var size = 1;
			value.forEach(function(dest_address) {
				if ('dl_name' in dest_address) {
					size += types.cstring.size(dest_address.dl_name) + 1;
				} else {
					size += types.cstring.size(dest_address.destination_addr) + 3;
				}
			});
			return size;
		},
		default: []
	},
	unsuccess_sme_array: {
		read: function(buffer, offset) {
			var unsuccess_sme, result = [];
			var no_unsuccess = buffer.readUInt8(offset++);
			while (no_unsuccess-- > 0) {
				unsuccess_sme = {
					dest_addr_ton: buffer.readUInt8(offset++),
					dest_addr_npi: buffer.readUInt8(offset++),
					destination_addr: types.cstring.read(buffer, offset)
				};
				offset += types.cstring.size(unsuccess_sme.destination_addr);
				unsuccess_sme.error_status_code = buffer.readUInt32BE(offset);
				offset += 4;
				result.push(unsuccess_sme);
			}
			return result;
		},
		write: function(value, buffer, offset) {
			buffer.writeUInt8(value.length, offset++);
			value.forEach(function(unsuccess_sme) {
				buffer.writeUInt8(unsuccess_sme.dest_addr_ton, offset++);
				buffer.writeUInt8(unsuccess_sme.dest_addr_npi, offset++);
				types.cstring.write(unsuccess_sme.destination_addr, buffer, offset);
				offset += types.cstring.size(unsuccess_sme.destination_addr);
				buffer.writeUInt32BE(unsuccess_sme.error_status_code, offset);
				offset += 4;
			});
		},
		size: function(value) {
			var size = 1;
			value.forEach(function(unsuccess_sme) {
				size += types.cstring.size(unsuccess_sme.destination_addr) + 6;
			});
			return size;
		},
		default: []
	}
};

var commands = {
	alert_notification: {
		id: 0x00000102,
		params: {
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			esme_addr_ton: {type: types.int8},
			esme_addr_npi: {type: types.int8},
			esme_addr: {type: types.cstring}
		}
	},
	bind_receiver: {
		id: 0x00000001,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_receiver_resp: {
		id: 0x80000001,
		params: {
			system_id: {type: types.cstring}
		}
	},
	bind_transmitter: {
		id: 0x00000002,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_transmitter_resp: {
		id: 0x80000002,
		params: {
			system_id: {type: types.cstring}
		}
	},
	bind_transceiver: {
		id: 0x00000009,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring},
			system_type: {type: types.cstring},
			interface_version: {type: types.int8, default: 0x50},
			addr_ton: {type: types.int8},
			addr_npi: {type: types.int8},
			address_range: {type: types.cstring}
		}
	},
	bind_transceiver_resp: {
		id: 0x80000009,
		params: {
			system_id: {type: types.cstring}
		}
	},
	broadcast_sm: {
		id: 0x00000111,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			message_id: {type: types.cstring},
			priority_flag: {type: types.int8},
			schedule_delivery_time:	{type: types.cstring},
			validity_period: {type: types.cstring},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8},
			sm_default_msg_id: {type: types.int8}
		}
	},
	broadcast_sm_resp: {
		id: 0x80000111,
		params: {
			message_id: {type: types.cstring}
		}
	},
	cancel_broadcast_sm: {
		id: 0x00000113,
		params: {
			service_type: {type: types.cstring},
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	cancel_broadcast_sm_resp: {
		id: 0x80000113
	},
	cancel_sm: {
		id: 0x00000008,
		params: {
			service_type: {type: types.cstring},
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring}
		}
	},
	cancel_sm_resp: {
		id: 0x80000008
	},
	data_sm: {
		id: 0x00000103,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			registered_delivery: {type: types.int8},
			data_coding: {type: types.int8}
		}
	},
	data_sm_resp: {
		id: 0x80000103,
		params: {
			message_id: {type: types.cstring}
		}
	},
	deliver_sm: {
		id: 0x00000005,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring},
			validity_period: {type: types.cstring},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.string}
		}
	},
	deliver_sm_resp: {
		id: 0x80000005,
		params: {
			message_id: {type: types.cstring}
		}
	},
	enquire_link: {
		id: 0x00000015
	},
	enquire_link_resp: {
		id: 0x80000015
	},
	generic_nack: {
		id: 0x80000000
	},
	outbind: {
		id: 0x0000000B,
		params: {
			system_id: {type: types.cstring},
			password: {type: types.cstring}
		}
	},
	query_broadcast_sm: {
		id: 0x00000112,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	query_broadcast_sm_resp: {
		id: 0x80000112,
		params: {
			message_id: {type: types.cstring}
		}
	},
	query_sm: {
		id: 0x00000003,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring}
		}
	},
	query_sm_resp: {
		id: 0x80000003,
		params: {
			message_id: {type: types.cstring},
			final_date: {type: types.cstring},
			message_state: {type: types.int8},
			error_code: {type: types.int8}
		}
	},
	replace_sm: {
		id: 0x00000007,
		params: {
			message_id: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			schedule_delivery_time: {type: types.cstring},
			validity_period: {type: types.cstring},
			registered_delivery: {type: types.int8},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.string}
		}
	},
	replace_sm_resp: {
		id: 0x80000007
	},
	submit_multi: {
		id: 0x00000021,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			//number_of_dests: {type: types.int8},
			dest_address: {type: types.dest_address_array},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring},
			validity_period: {type: types.cstring},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.string}
		}
	},
	submit_multi_resp: {
		id: 0x80000021,
		params: {
			message_id: {type: types.cstring},
			//no_unsuccess: {type: types.int8},
			unsuccess_sme: {type: types.unsuccess_sme_array}
		}
	},
	submit_sm: {
		id: 0x00000004,
		params: {
			service_type: {type: types.cstring},
			source_addr_ton: {type: types.int8},
			source_addr_npi: {type: types.int8},
			source_addr: {type: types.cstring},
			dest_addr_ton: {type: types.int8},
			dest_addr_npi: {type: types.int8},
			destination_addr: {type: types.cstring},
			esm_class: {type: types.int8},
			protocol_id: {type: types.int8},
			priority_flag: {type: types.int8},
			schedule_delivery_time: {type: types.cstring},
			validity_period: {type: types.cstring},
			registered_delivery: {type: types.int8},
			replace_if_present_flag: {type: types.int8},
			data_coding: {type: types.int8},
			sm_default_msg_id: {type: types.int8},
			//sm_length: {type: types.int8},
			short_message: {type: types.string}
		}
	},
	submit_sm_resp: {
		id: 0x80000004,
		params: {
			message_id: {type: types.cstring}
		}
	},
	unbind: {
		id: 0x00000006
	},
	unbind_resp: {
		id: 0x80000006
	}
};

var commandsById = {};

for (var command in commands) if (commands.hasOwnProperty(command)) {
	commandsById[commands[command].id] = commands[command];
	commands[command].command = command;
}

exports.errors = {
	ESME_ROK:                 0x0000,
	ESME_RINVMSGLEN:          0x0001,
	ESME_RINVCMDLEN:          0x0002,
	ESME_RINVCMDID:           0x0003,
	ESME_RINVBNDSTS:          0x0004,
	ESME_RALYBND:             0x0005,
	ESME_RINVPRTFLG:          0x0006,
	ESME_RINVREGDLVFLG:       0x0007,
	ESME_RSYSERR:             0x0008,
	ESME_RINVSRCADR:          0x000A,
	ESME_RINVDSTADR:          0x000B,
	ESME_RINVMSGID:           0x000C,
	ESME_RBINDFAIL:           0x000D,
	ESME_RINVPASWD:           0x000E,
	ESME_RINVSYSID:           0x000F,
	ESME_RCANCELFAIL:         0x0011,
	ESME_RREPLACEFAIL:        0x0013,
	ESME_RMSGQFUL:            0x0014,
	ESME_RINVSERTYP:          0x0015,
	ESME_RINVNUMDESTS:        0x0033,
	ESME_RINVDLNAME:          0x0034,
	ESME_RINVDESTFLAG:        0x0040,
	ESME_RINVSUBREP:          0x0042,
	ESME_RINVESMCLASS:        0x0043,
	ESME_RCNTSUBDL:           0x0044,
	ESME_RSUBMITFAIL:         0x0045,
	ESME_RINVSRCTON:          0x0048,
	ESME_RINVSRCNPI:          0x0049,
	ESME_RINVDSTTON:          0x0050,
	ESME_RINVDSTNPI:          0x0051,
	ESME_RINVSYSTYP:          0x0053,
	ESME_RINVREPFLAG:         0x0054,
	ESME_RINVNUMMSGS:         0x0055,
	ESME_RTHROTTLED:          0x0058,
	ESME_RINVSCHED:           0x0061,
	ESME_RINVEXPIRY:          0x0062,
	ESME_RINVDFTMSGID:        0x0063,
	ESME_RX_T_APPN:           0x0064,
	ESME_RX_P_APPN:           0x0065,
	ESME_RX_R_APPN:           0x0066,
	ESME_RQUERYFAIL:          0x0067,
	ESME_RINVTLVSTREAM:       0x00C0,
	ESME_RTLVNOTALLWD:        0x00C1,
	ESME_RINVTLVLEN:          0x00C2,
	ESME_RMISSINGTLV:         0x00C3,
	ESME_RINVTLVVAL:          0x00C4,
	ESME_RDELIVERYFAILURE:    0x00FE,
	ESME_RUNKNOWNERR:         0x00FF,
	ESME_RSERTYPUNAUTH:       0x0100,
	ESME_RPROHIBITED:         0x0101,
	ESME_RSERTYPUNAVAIL:      0x0102,
	ESME_RSERTYPDENIED:       0x0103,
	ESME_RINVDCS:             0x0104,
	ESME_RINVSRCADDRSUBUNIT:  0x0105,
	ESME_RINVDSTADDRSUBUNIT:  0x0106,
	ESME_RINVBCASTFREQINT:    0x0107,
	ESME_RINVBCASTALIAS_NAME: 0x0108,
	ESME_RINVBCASTAREAFMT:    0x0109,
	ESME_RINVNUMBCAST_AREAS:  0x010A,
	ESME_RINVBCASTCNTTYPE:    0x010B,
	ESME_RINVBCASTMSGCLASS:   0x010C,
	ESME_RBCASTFAIL:          0x010D,
	ESME_RBCASTQUERYFAIL:     0x010E,
	ESME_RBCASTCANCELFAIL:    0x010F,
	ESME_RINVBCAST_REP:       0x0110,
	ESME_RINVBCASTSRVGRP:     0x0111,
	ESME_RINVBCASTCHANIND:    0x0112
};

exports.commands = commands;
exports.commandsById = commandsById;

exports.types = types;
