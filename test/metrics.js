var assert = require('assert'),
	net = require('net'),
	tls = require('tls'),
	fs = require('fs'),
    smpp = require('..'),
 	http = require('http'),
	PDU = require('../lib/pdu').PDU,
	Buffer = require("safer-buffer").Buffer;

describe('Prometheus metrics', function() {
	var server, port, serverMetricsPort = 9118, clientMetricsPort = 9119, debugBuffer = [], lastServerError;

	var httpGet = function(hostname, port, path) {
		return new Promise(function(resolve, reject) {
			http.get({hostname: 'localhost', port: port, path: path}, async (res) => {
				let body = '';
				for await (const chunk of res) {
					body += chunk;
				}
				resolve(body);
			});
		});
	}

	beforeEach(function (done) {
		let debugCallsMetric = null;
		server = smpp.createServer({
			metricsEnabled: true,
			metricsPort: serverMetricsPort,
			metricsLabels: {"label": "my-custom-label"},
			metricsPrefix: "smpp_tests_"
		}, function (session) {
			debugBuffer = [];
			// We'll use the debug event to track what happened inside the server
			session.on('debug', function(type, msg, payload) {
				debugCallsMetric.labels({'my_custom_label': 'custom-label-1'}).inc(1); // metric for counting debug calls
				server.metricsHandler.metrics.number_of_debug_calls ++; // Custom exposed metric to debug
				debugBuffer.push({type: type, msg: msg, payload: payload});
			});
			session.on('submit_sm', function (pdu) {
				var response = pdu.response();
				response.message_id = "123456789 sent to " + pdu.destination_addr; // Injected to verify the data received by the server
				session.send(response);
			});
			session.on('bind_transceiver', function (pdu) {
				// pause the session to prevent further incoming pdu events,
				// untill we authorize the session with some async operation.
				session.pause();
				var checkAsyncUserPass = function (user, pwd, onComplete) {
					setTimeout(function () {
						if (user === "FAKE_USER" && pwd === "FAKE_PASSWORD") {
							onComplete();
						} else {
							onComplete("invalid user and password combination");
						}
					}, 25); // Delayed processing simulation
				};
				checkAsyncUserPass(pdu.system_id, pdu.password, function (err) {
					if (err) {
						session.send(pdu.response({ command_status: smpp.ESME_RBINDFAIL}));
						session.close();
					} else {
						session.send(pdu.response());
						session.resume();
					}
				});
			});
			// Errors
			session.on('error', function (err) {
				lastServerError = err;
				session.close();
			});
		});
		debugCallsMetric = server.metricsHandler.addCounter("number_of_debug_calls", "This is a sample of a custom injected metric", ['my_custom_label']);
		server.metricsHandler.metrics.number_of_debug_calls = 0; // Custom exposed metric to debug
		server.listen(0, done);
		port = server.address().port;
	});

	afterEach(function (done) {
		server.sessions.forEach(function (session) {
			session.close();
		});
		server.close(done);
	});

	describe('Metrics endpoints', function() {

		it('Should expose monitoring metrics for server & client', function (done) {
			var session = smpp.connect({
				port: port,
				metricsEnabled: true,
				metricsPort: clientMetricsPort,
				metricsLabels: {"label": "my-custom-label"},
				metricsPrefix: "smpp_tests_"
			}, function () {
				session.bind_transceiver({
					system_id: 'FAKE_USER',
					password: 'FAKE_PASSWORD'
				}, function (pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					assert.equal(pdu.command_status, smpp.ESME_ROK);
					// Inject a custom client metric that will be exposed to prometheus
					session.metricsHandler.addCounter("my_awesome_metric", "An awesome metric", ['my_custom_label']).labels({'my_custom_label': 'label1'}).inc(25);
					session.metricsHandler.metrics.an_awesome_metric = 1234.56; // Custom exposed metric to debug
					// send fake message
					session.submit_sm({
						destination_addr: "+01123456789",
						short_message: "Hello!"
					}, function (pdu) {
						assert.equal(pdu.command_status, smpp.ESME_ROK);
						httpGet('localhost', serverMetricsPort, '/metrics').then((bodyServer)=> {
							// global metrics
							assert(bodyServer.match('smpp_tests_connected_count{label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_socket_data_in{label="my-custom-label",smpp_mode="server"}'));
							assert(bodyServer.match('smpp_tests_socket_data_out{label="my-custom-label",smpp_mode="server"}'));
							assert(bodyServer.match('smpp_tests_pdu_command_out{command="bind_transceiver_resp",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_pdu_command_out{command="submit_sm_resp",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_pdu_command_in{command="bind_transceiver",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_pdu_command_in{command="submit_sm",label="my-custom-label",smpp_mode="server"} 1'));
							// per connection metrics
							assert(bodyServer.match('smpp_tests_conn_socket_data_in{system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"}'));
							assert(bodyServer.match('smpp_tests_conn_socket_data_out{system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"}'));
							assert(bodyServer.match('smpp_tests_conn_pdu_command_in{command="bind_transceiver",system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_conn_pdu_command_in{command="submit_sm",system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_conn_pdu_command_out{command="bind_transceiver_resp",system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"} 1'));
							assert(bodyServer.match('smpp_tests_conn_pdu_command_out{command="submit_sm_resp",system_id="FAKE_USER",remote_address="::ffff:127.0.0.1",label="my-custom-label",smpp_mode="server"} 1'));
							// Custom server metric added
							assert(bodyServer.match('smpp_tests_number_of_debug_calls{my_custom_label="custom-label-1",label="my-custom-label",smpp_mode="server"}'));
							httpGet('localhost', clientMetricsPort, '/metrics').then((bodyClient)=> {
								// global metrics
								assert(bodyClient.match('smpp_tests_connected_count{label="my-custom-label",smpp_mode="client"} 1'));
								assert(bodyClient.match('smpp_tests_socket_data_in{label="my-custom-label",smpp_mode="client"}'));
								assert(bodyClient.match('smpp_tests_socket_data_out{label="my-custom-label",smpp_mode="client"}'));
								assert(bodyClient.match('smpp_tests_pdu_command_out{command="bind_transceiver",label="my-custom-label",smpp_mode="client"} 1'));
								assert(bodyClient.match('smpp_tests_pdu_command_out{command="submit_sm",label="my-custom-label",smpp_mode="client"} 1'));
								assert(bodyClient.match('smpp_tests_pdu_command_in{command="bind_transceiver_resp",label="my-custom-label",smpp_mode="client"} 1'));
								assert(bodyClient.match('smpp_tests_pdu_command_in{command="submit_sm_resp",label="my-custom-label",smpp_mode="client"} 1'));
								// custom metric added
								assert(bodyClient.match('smpp_tests_my_awesome_metric{my_custom_label="label1",label="my-custom-label",smpp_mode="client"} 25'));
								done();
							});
						});
					});
				});
			});
		});

		it('Should expose monitoring debug for server & client', function (done) {
			var session = smpp.connect({
				port: port,
				metricsEnabled: true,
				metricsPort: clientMetricsPort,
				metricsLabels: {"label": "my-custom-label"},
				metricsPrefix: "smpp_tests_"
			}, function () {
				session.metricsHandler.metrics.an_awesome_metric = 1234.56; // Custom exposed metric
				session.bind_transceiver({
					system_id: 'FAKE_USER',
					password: 'FAKE_PASSWORD'
				}, function (pdu) {
					assert.equal(pdu.command, "bind_transceiver_resp");
					assert.equal(pdu.command_status, smpp.ESME_ROK);
					// send fake message
					session.submit_sm({
						destination_addr: "+01123456789",
						short_message: "Hello!"
					}, function (pdu) {
						assert.equal(pdu.command_status, smpp.ESME_ROK);
						httpGet('localhost', serverMetricsPort, '/debug').then((bodyServer)=> {
							let jsonServer = JSON.parse(bodyServer);
							assert.equal('server', jsonServer.mode);
							assert.equal(1, jsonServer.connected_count);
							// Connected list
							let firstConnection = jsonServer.connected_list[Object.keys(jsonServer.connected_list)[0]];
							assert.equal(firstConnection.system_id, 'FAKE_USER');
							assert.equal(firstConnection.pdu_command_in, 2);
							assert.equal(firstConnection.pdu_command_out, 2);
							assert(firstConnection.socket_data_in > 20);
							assert(firstConnection.socket_data_out > 20);
							// Custom injected metric
							assert(jsonServer.number_of_debug_calls > 2);
							//console.dir(jsonServer);
							httpGet('localhost', clientMetricsPort, '/debug').then((bodyClient)=> {
								let jsonClient = JSON.parse(bodyClient);
								assert.equal('client', jsonClient.mode);
								assert.equal(1, jsonClient.connected_count);
								// Custom injected metric
								assert.equal(1234.56, jsonClient.an_awesome_metric);
								//console.dir(jsonClient);
								done();
							});
						});
					});
				});
			});
		});

	});

});
