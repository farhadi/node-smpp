var http = require('http'),
	url = require('url'),
	client = require('prom-client');

function Metrics(mode, options) {
	var self = this;

	this.serverMode = mode === "server";
	this.clientMode = mode === "client";
	this.register = new client.Registry();
	this.options = options;
	this.metrics = {};
	this.promMetrics = {};
	this.resetInterval = null;

	if (!this.serverMode && !this.clientMode) {
		throw Error("Invalid mode: "+mode);
	}

	options.timeout = options.timeout || 10000;
	options.labels = options.labels || {}
	options.labels.smpp_mode = this.serverMode ? "server" : this.clientMode ? "client" : "unknown";
	options.prefix = options.prefix || 'smpp_';

	if (this.serverMode) {
		this.metrics = {
			mode: 'server',
			started: (new Date()).toISOString(),
			last_reset: (new Date()).toISOString(),
			tls: options.serverTls || null,
			connected_count: 0,
			connected_list: {},
			pdu_command_in: {},
			pdu_command_out: {},
			pdu_command_error: 0,
			socket_error: 0,
			socket_data_error: 0,
			socket_data_in: 0,
			socket_data_out: 0
		}
		this.promMetrics = {
			connected_count: new client.Gauge({ name: options.prefix + 'connected_count', help: 'Connections opened', registers: [self.register]}),
			socket_error: new client.Counter({ name: options.prefix + 'socket_error', help: 'Socket errors', registers: [self.register]}),
			socket_data_error: new client.Counter({ name: options.prefix + 'socket_data_error', help: 'Socket write errors', registers: [self.register]}),
			socket_data_in: new client.Counter({ name: options.prefix + 'socket_data_in', help: 'Bytes in', registers: [self.register]}),
			socket_data_out: new client.Counter({ name: options.prefix + 'socket_data_out', help: 'Bytes out', registers: [self.register]}),
			pdu_command_out: new client.Counter({ name: options.prefix + 'pdu_command_out', help: 'Commands out', registers: [self.register], labelNames: ['command']}),
			pdu_command_in: new client.Counter({ name: options.prefix + 'pdu_command_in', help: 'Commands in', registers: [self.register], labelNames: ['command']}),
			pdu_command_error: new client.Counter({ name: options.prefix + 'pdu_command_error', help: 'Commands errors', registers: [self.register]}),
			per_connection: {
				socket_error: new client.Counter({ name: options.prefix + 'conn_socket_error', help: 'Per-connection socket errors', registers: [self.register], labelNames: ['system_id', 'remote_address']}),
				socket_data_error: new client.Counter({ name: options.prefix + 'conn_socket_data_error', help: 'Per-connection socket write errors', registers: [self.register], labelNames: ['system_id', 'remote_address']}),
				socket_data_in: new client.Counter({ name: options.prefix + 'conn_socket_data_in', help: 'Per-connection bytes in', registers: [self.register], labelNames: ['system_id', 'remote_address']}),
				socket_data_out: new client.Counter({ name: options.prefix + 'conn_socket_data_out', help: 'Per-connection bytes out', registers: [self.register], labelNames: ['system_id', 'remote_address']}),
				pdu_command_in: new client.Counter({ name: options.prefix + 'conn_pdu_command_in', help: 'Per-connection commands in', registers: [self.register], labelNames: ['command', 'system_id', 'remote_address']}),
				pdu_command_out: new client.Counter({ name: options.prefix + 'conn_pdu_command_out', help: 'Per-connection commands out', registers: [self.register], labelNames: ['command', 'system_id', 'remote_address']}),
				pdu_command_error: new client.Counter({ name: options.prefix + 'conn_pdu_command_error', help: 'Per-connection commands errors', registers: [self.register], labelNames: ['system_id', 'remote_address']})
			}
		}
		this.resetInterval = setInterval(function() {
			// Reset metrics from time to time
			this.metrics.last_reset = (new Date()).toISOString();
			self.register.resetMetrics();
		}, 3600 * 6);
	}
	if (this.clientMode) {
		this.metrics = {
			mode: 'client',
			started: (new Date()).toISOString(),
			host: options.clientHost || null,
			port: options.clientPort || null,
			tls: options.clientTls || null,
			connected_count: 0,
			connected_list: {},
			pdu_command_in: {},
			pdu_command_out: {},
			pdu_command_error: 0,
			socket_error: 0,
			socket_data_error: 0,
			socket_data_in: 0,
			socket_data_out: 0
    	}
		this.promMetrics = {
			connected_count: new client.Gauge({ name: options.prefix + 'connected_count', help: 'Connections opened', registers: [self.register]}),
			socket_error: new client.Counter({ name: options.prefix + 'socket_error', help: 'Socket errors', registers: [self.register]}),
			socket_data_error: new client.Counter({ name: options.prefix + 'socket_data_error', help: 'Socket write errors', registers: [self.register]}),
			socket_data_in: new client.Counter({ name: options.prefix + 'socket_data_in', help: 'Bytes in', registers: [self.register]}),
			socket_data_out: new client.Counter({ name: options.prefix + 'socket_data_out', help: 'Bytes out', registers: [self.register]}),
			pdu_command_out: new client.Counter({ name: options.prefix + 'pdu_command_out', help: 'Command out', registers: [self.register], labelNames: ['command']}),
			pdu_command_in: new client.Counter({ name: options.prefix + 'pdu_command_in', help: 'Command in', registers: [self.register], labelNames: ['command']}),
			pdu_command_error: new client.Counter({ name: options.prefix + 'pdu_command_error', help: 'Command errors', registers: [self.register]}),
		}
	}

	// Create a Registry to register the metrics
	client.collectDefaultMetrics({
		prefix: options.prefix,
		labels: options.labels,
		timeout: options.timeout,
		gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
		register: self.register
	});
	self.register.setDefaultLabels(options.labels);

	// Define the HTTP server
	this.server = http.createServer(async (req, res) => {
	  const route = url.parse(req.url).pathname
	  try {
		  if (route === '/metrics') {
			  res.setHeader('Content-Type', self.register.contentType);
			  res.end(await self.register.metrics());
		  } else if(route === '/debug') {
			  res.setHeader('Content-Type', 'application/json');
			  res.end(JSON.stringify(self.metrics, null, 4));
		  } else {
			  res.statusMessage = '404 Not found';
			  res.statusCode = 404;
			  res.end(res.statusMessage);
		  }
	  } catch(err) {
		  console.log("Error in metrics: "+err.message);
	  }
	});

	this.server.listen(options.port);
}

Metrics.prototype.addCounter = function(name, help, labelNames){
	if (labelNames==undefined) {
		labelNames = [];
	}
	return new client.Counter({ name: this.options.prefix + name, help: help, registers: [this.register], labelNames: labelNames});
}

Metrics.prototype.addGauge = function(name, help, labelNames){
	if (labelNames==undefined) {
		labelNames = [];
	}
	return new client.Gauge({ name: this.options.prefix + name, help: help, registers: [this.register], labelNames: labelNames});
}

Metrics.prototype.close = function(callback) {
	clearInterval(this.resetInterval);
	this.server.close( callback || function() {});
}

Metrics.prototype.event = function(event, value, payload) {
	if (this.serverMode) {
		this.serverEvent(event, value, payload);
	}
	if (this.clientMode) {
		this.clientEvent(event, value, payload);
	}
}

Metrics.prototype.connectedClientProperty = function(key, value, payload) {
	if(payload===undefined) {
		payload = {}
	}
	let connectedClient = (payload.remoteAddress || null)+":"+(payload.remotePort || null);
	if (this.metrics.connected_list.hasOwnProperty(connectedClient)) {
		this.metrics.connected_list[connectedClient][key] = value;
		this.metrics.connected_list[connectedClient].last_data = new Date();
		this.metrics.connected_list[connectedClient].id = payload.sessionId || this.metrics.connected_list[connectedClient].id || null;
		this.metrics.connected_list[connectedClient].sequence = payload.sessionSequence || this.metrics.connected_list[connectedClient].sequence || null;
	}
}

Metrics.prototype.connectedClientMetric = function(key, value, payload) {
	if(payload===undefined) {
		payload = {}
	}
	let remoteAddress = (payload.remoteAddress || null)
	let remotePort = (payload.remotePort || null);
	let connectedClient = remoteAddress + ':' + remotePort;
	if (this.metrics.connected_list.hasOwnProperty([connectedClient])) {
		if (!this.metrics.connected_list[connectedClient].hasOwnProperty(key)) {
			this.metrics.connected_list[connectedClient][key] = 0;
		}
		this.metrics.connected_list[connectedClient][key] += value;
		this.metrics.connected_list[connectedClient].last_data = new Date();
		this.metrics.connected_list[connectedClient].id = payload.sessionId || this.metrics.connected_list[connectedClient].id || null;
		this.metrics.connected_list[connectedClient].sequence = payload.sessionSequence || this.metrics.connected_list[connectedClient].sequence || null;
		if (this.serverMode) {
			if (this.promMetrics.per_connection.hasOwnProperty(key)) {
				if (key === "pdu_command_out" || key === "pdu_command_in") {
					this.promMetrics.per_connection[key].labels({command: payload.command || null, system_id: this.metrics.connected_list[connectedClient].system_id, remote_address: remoteAddress}).inc(1);
				} else {
					this.promMetrics.per_connection[key].labels({system_id: this.metrics.connected_list[connectedClient].system_id, remote_address: remoteAddress}).inc(value);
				}
			}
		}
	}
}

Metrics.prototype.clientEvent = function(event, value, payload) {
	switch(event) {
		case "server.connected":
			this.metrics.connected_count += value;
			this.promMetrics.connected_count.inc(value);
			this.metrics.connected_list[ payload.remoteAddress+":"+payload.remotePort ] = {
				date: new Date(),
				last_data: new Date(),
				id: payload.sessionId || null,
				system_id: null,
				sequence: payload.sessionSequence || null,
				socket_error: 0,
				socket_data_error: 0,
				socket_data_in: 0,
				socket_data_out: 0,
				pdu_command_in: 0,
				pdu_command_out: 0,
				pdu_command_error: 0
			}
			break;
		case "server.disconnected":
			this.metrics.connected_count -= value;
			this.promMetrics.connected_count.dec(value);
			delete this.metrics.connected_list[ payload.remoteAddress+":"+payload.remotePort ] ;
			break;
		case "socket.error":
			this.metrics.socket_error += value;
			this.promMetrics.socket_error.inc(value);
			this.connectedClientMetric("socket_error", value, payload);
			break;
		case "socket.data.in":
			this.metrics.socket_data_in += value;
			this.promMetrics.socket_data_in.inc(value);
			this.connectedClientMetric("socket_data_in", value, payload);
			break;
		case "socket.data.out":
			this.metrics.socket_data_out += value;
			this.promMetrics.socket_data_out.inc(value);
			this.connectedClientMetric("socket_data_out", value, payload);
			break;
		case "socket.data.error":
			this.metrics.socket_data_error += value;
			this.promMetrics.socket_data_error.inc(value);
			this.connectedClientMetric("socket_data_error", value, payload);
			break;
		case "pdu.command.in":
			this.metrics.pdu_command_in[value] = (this.metrics.pdu_command_in[value] || 0) + 1;
			this.promMetrics.pdu_command_in.labels({command: value}).inc(1);
			this.connectedClientMetric("pdu_command_in", 1, payload);
			break;
		case "pdu.command.out":
			if (value==="bind_transceiver") {
				this.connectedClientProperty('system_id', payload.system_id, payload);
			}
			this.metrics.pdu_command_out[value] = (this.metrics.pdu_command_out[value] || 0) + 1;
			this.promMetrics.pdu_command_out.labels({command: value}).inc(1);
			this.connectedClientMetric("pdu_command_out", 1, payload);
			break;
		case "pdu.command.error":
			this.metrics.pdu_command_error += value;
			this.promMetrics.pdu_command_error.inc(value);
			this.connectedClientMetric("pdu_command_error", 1, payload);
			break;
	}
};

Metrics.prototype.serverEvent = function(event, value, payload) {
	switch(event) {
		case "client.connected":
			this.metrics.connected_count += value;
			this.promMetrics.connected_count.inc(value);
			this.metrics.connected_list[ payload.remoteAddress+":"+payload.remotePort ] = {
				date: new Date(),
				last_data: new Date(),
				id: payload.sessionId || null,
				system_id: null,
				sequence: payload.sessionSequence || null,
				socket_error: 0,
				socket_data_error: 0,
				socket_data_in: 0,
				socket_data_out: 0,
				pdu_command_in: 0,
				pdu_command_out: 0,
				pdu_command_error: 0
			}
			break;
		case "client.disconnected":
			this.metrics.connected_count -= value;
			this.promMetrics.connected_count.dec(value);
			delete this.metrics.connected_list[ payload.remoteAddress+":"+payload.remotePort ] ;
			break;
		case "socket.error":
			this.metrics.socket_error += value;
			this.promMetrics.socket_error.inc(value);
			this.connectedClientMetric("socket_error", value, payload);
			break;
		case "socket.data.in":
			this.metrics.socket_data_in += value;
			this.promMetrics.socket_data_in.inc(value);
			this.connectedClientMetric("socket_data_in", value, payload);
			break;
		case "socket.data.out":
			this.metrics.socket_data_out += value;
			this.promMetrics.socket_data_out.inc(value);
			this.connectedClientMetric("socket_data_out", value, payload);
			break;
		case "socket.data.error":
			this.metrics.socket_data_error += value;
			this.promMetrics.socket_data_error.inc(value);
			this.connectedClientMetric("socket_data_error", value, payload);
			break;
		case "pdu.command.in":
			if (value==="bind_transceiver") {
				this.connectedClientProperty('system_id', payload.system_id, payload);
			}
			this.metrics.pdu_command_in[value] = (this.metrics.pdu_command_in[value] || 0) + 1;
			this.promMetrics.pdu_command_in.labels({command: value}).inc(1);
			this.connectedClientMetric("pdu_command_in", 1, payload);
			break;
		case "pdu.command.out":
			this.metrics.pdu_command_out[value] = (this.metrics.pdu_command_out[value] || 0) + 1;
			this.promMetrics.pdu_command_out.labels({command: value}).inc(1);
			this.connectedClientMetric("pdu_command_out", 1, payload);
			break;
		case "pdu.command.error":
			this.metrics.pdu_command_error += value;
			this.promMetrics.pdu_command_error.inc(value);
			this.connectedClientMetric("pdu_command_error", 1, payload);
			break;
	}
};

exports.serverSetup = function(options) {
	options.port = options.port || 9108;
	options.prefix = options.prefix || "smpp_";
	options.timeout = options.timeout || 10000;
	options.labels = options.labels || {};
	return new Metrics("server", options);
};
exports.clientSetup = function(options) {
	options.port = options.port || 9109;
	options.prefix = options.prefix || "smpp_";
	options.timeout = options.timeout || 10000;
	options.labels = options.labels || {};
	return new Metrics("client", options);
};

exports.Metrics = Metrics;
