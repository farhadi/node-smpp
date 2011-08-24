var types = {
	Int8: {
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
	Int16: {
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
	Int32: {
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
	String: {
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
	CString: {
		read: function(buffer, offset) {
			var length = 0;
			while (buffer[offset + length]) {
				length++
			}
			return buffer.toString('ascii', offset, offset + length);
		},
		write: function(value, buffer, offset) {
			buffer.write(value, offset, 'ascii');
			buffer[offset + value.length + 1] = 0;
		},
		size: function(value) {
			return value.length + 1;
		},
		default: ''
	}
};

var commands = {
	alert_notification: {
		id: 0x00000102,
		params: {

		}
	},
	bind_receiver: {
		id: 0x00000001,
		params: {
			system_id: {type: types.CString},
			password: {type: types.CString},
			system_type: {type: types.CString},
			interface_version: {type: types.Int8, default: 0x50},
			addr_ton: {type: types.Int8},
			addr_npi: {type: types.Int8},
			address_range: {type: types.CString}
		}
	},
	bind_receiver_resp: {
		id: 0x80000001,
		params: {
			system_id: {type: types.CString}
		}
	},
	bind_transmitter: {
		id: 0x00000002,
		params: {
			system_id: {type: types.CString},
			password: {type: types.CString},
			system_type: {type: types.CString},
			interface_version: {type: types.Int8, default: 0x50},
			addr_ton: {type: types.Int8},
			addr_npi: {type: types.Int8},
			address_range: {type: types.CString}
		}
	},
	bind_transmitter_resp: {
		id: 0x80000002,
		params: {
			system_id: {type: types.CString}
		}
	},
	bind_transceiver: {
		id: 0x00000009,
		params: {
			system_id: {type: types.CString},
			password: {type: types.CString},
			system_type: {type: types.CString},
			interface_version: {type: types.Int8, default: 0x50},
			addr_ton: {type: types.Int8},
			addr_npi: {type: types.Int8},
			address_range: {type: types.CString}
		}
	},
	bind_transceiver_resp: {
		id: 0x80000009,
		params: {
			system_id: {type: types.CString}
		}
	},
	broadcast_sm: {
		id: 0x00000111,
		params: {

		}
	},
	broadcast_sm_resp: {
		id: 0x80000111,
		params: {

		}
	},
	cancel_broadcast_sm: {
		id: 0x00000113,
		params: {

		}
	},
	cancel_broadcast_sm_resp: {
		id: 0x80000113
	},
	cancel_sm: {
		id: 0x00000008,
		params: {

		}
	},
	cancel_sm_resp: {
		id: 0x80000008
	},
	data_sm: {
		id: 0x00000103,
		params: {

		}
	},
	data_sm_resp: {
		id: 0x80000103,
		params: {

		}
	},
	deliver_sm: {
		id: 0x00000005,
		params: {

		}
	},
	deliver_sm_resp: {
		id: 0x80000005,
		params: {

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

		}
	},
	query_broadcast_sm: {
		id: 0x00000112,
		params: {

		}
	},
	query_broadcast_sm_resp: {
		id: 0x80000112,
		params: {

		}
	},
	query_sm: {
		id: 0x00000003,
		params: {

		}
	},
	query_sm_resp: {
		id: 0x80000003,
		params: {

		}
	},
	replace_sm: {
		id: 0x00000007,
		params: {

		}
	},
	replace_sm_resp: {
		id: 0x80000007
	},
	submit_multi: {
		id: 0x00000021,
		params: {

		}
	},
	submit_multi_resp: {
		id: 0x80000021,
		params: {

		}
	},
	submit_sm: {
		id: 0x00000004,
		params: {
			service_type: {type: types.CString},
			source_addr_ton: {type: types.Int8},
			source_addr_npi: {type: types.Int8},
			source_addr: {type: types.CString},
			dest_addr_ton: {type: types.Int8},
			dest_addr_npi: {type: types.Int8},
			destination_addr: {type: types.CString},
			esm_class: {type: types.Int8},
			protocol_id: {type: types.Int8},
			priority_flag: {type: types.Int8},
			schedule_delivery_time: {type: types.CString},
			validity_period: {type: types.CString},
			registered_delivery: {type: types.Int8},
			replace_if_present_flag: {type: types.Int8},
			data_coding: {type: types.Int8},
			sm_default_msg_id: {type: types.Int8},
			//sm_length: {type: types.Int8},
			short_message: {type: types.String}
		}
	},
	submit_sm_resp: {
		id: 0x80000004,
		params: {
			message_id: {type: types.CString}
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

for (command in commands) {
	if (!commands.hasOwnProperty(command)) {
		continue;
	}
	commandsById[commands[command].id] = commands[command];
	commands[command].command = command;
}

exports.addCommand = function(command, options) {
	options.command = command;
	commands[command] = options;
	commandsById[options.id] = options;
};

exports.commands = commands;
exports.commandsById = commandsById;

exports.types = types;