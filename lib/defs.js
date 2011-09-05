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

for (var command in commands) {
	if (!commands.hasOwnProperty(command)) {
		continue;
	}
	commandsById[commands[command].id] = commands[command];
	commands[command].command = command;
}

exports.commands = commands;
exports.commandsById = commandsById;

exports.types = types;
