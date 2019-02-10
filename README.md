node-smpp
=========
SMPP client and server implementation in node.js.

[![Build Status](https://travis-ci.org/farhadi/node-smpp.png)](https://travis-ci.org/farhadi/node-smpp)
[![Dependency Status](https://david-dm.org/farhadi/node-smpp.svg)](https://david-dm.org/farhadi/node-smpp)
[![devDependency Status](https://david-dm.org/farhadi/node-smpp/dev-status.svg)](https://david-dm.org/farhadi/node-smpp#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/github/farhadi/node-smpp/badge.svg?branch=master)](https://coveralls.io/github/farhadi/node-smpp?branch=master)

Introduction
------------
This is a complete implementation of SMPP v5.0 in node.js, with support for
custom commands and TLVs.

SMPP v5.0, by design, is backward compatible with v3.4, so you would be able to
use this module with 3.4 implementations. Even you can use this module with 3.3
implementations as far as you don't use TLV parameters and don't bind in transceiver mode.

The name of the methods and parameters in this implementation are equivalent to
the names defined in SMPP specification. So get a copy of
[SMPP v5.0 Specification](http://farhadi.ir/downloads/smppv50.pdf)
for a list of available operations and their parameters.

Installation
------------

    npm install smpp

Usage
-----
### Creating a SMPP session

``` javascript
var smpp = require('smpp');
var session = smpp.connect('smpp://example.com:2775');
session.bind_transceiver({
	system_id: 'YOUR_SYSTEM_ID',
	password: 'YOUR_PASSWORD'
}, function(pdu) {
	if (pdu.command_status == 0) {
		// Successfully bound
		session.submit_sm({
			destination_addr: 'DESTINATION NUMBER',
			short_message: 'Hello!'
		}, function(pdu) {
			if (pdu.command_status == 0) {
				// Message successfully sent
				console.log(pdu.message_id);
			}
		});
	}
});
```

### Creating a SMPP server

``` javascript
var smpp = require('smpp');
var server = smpp.createServer(function(session) {
	session.on('bind_transceiver', function(pdu) {
		// we pause the session to prevent further incoming pdu events,
		// untill we authorize the session with some async operation.
		session.pause();
		checkAsyncUserPass(pdu.system_id, pdu.password, function(err) {
			if (err) {
				session.send(pdu.response({
					command_status: smpp.ESME_RBINDFAIL
				}));
				session.close();
				return;
			}
			session.send(pdu.response());
			session.resume();
		});
	});
});
server.listen(2775);
```

Encodings
---------

This smpp implementation supports 3 encodings: `ASCII` (GSM 03.38), `LATIN1`, and `UCS2`.
Respective data_coding for these encodings are `0x01`, `0x03`, and `0x08`.

Default encoding for `data_coding:0` is `ASCII`. You can change it as follows:

``` javascript
smpp.encodings.default = 'LATIN1';
```

String messages will be automatically encoded using one of these three encodings.
If the SMSC you are communicating with doesn't support one of these encodings,
you can simply remove it as follows:

``` javascript
delete smpp.encodings.ASCII;
```

You can also manually convert a message to a buffer and pass it as `short_message`
or `message_payload` parameter to bypass automatic message encoding.

API
-------

### smpp.connect(url, [callback])
Creates a new smpp session using the specified connection url.
`url` must be a string in this format: `smpp://host:port`. To establish a secure
smpp connection use `ssmpp` as scheme like in `ssmpp://host:port`.
If `port` is omitted in the url, the default port (2775 for smpp and 3550 for
secure smpp) will be used.
If called without arguments, `smpp://localhost:2775` will be assumed.

The `callback`, if specified, will be added as a listener for the `connect`
event in plain connections and `secureConnect` event in secure connections.

### smpp.Session
This is the base object for a SMPP session. sessions can be created by calling
`smpp.connect()` or can be created by a smpp server when a client
establishes a connection to the server. In this case the server passes the
session object to the `'session'` event listener.

#### session.send(pdu, [responseCallback], [sendCallback])
Sends a pdu request/response to the MC/ESME over the session.
The `pdu` is an instance of `smpp.PDU` which might be either a response or
a request pdu.

When sending a request pdu, `pdu.sequence_number` will be automatically set to
the proper value.

If the `pdu` is a request pdu, when the relevant response is received, the
optional `responseCallback` parameter will be invoked with the response pdu passed to it.

Optional `sendCallback` will be called when the pdu is flushed.

#### session.close([callback])
Closes the current session connection.
If supplied, the `callback` is called once the session is fully closed.

#### session.destroy([callback])
Forcibly closes the current session connection. This aids some broken servers,
that don't honor gracefull tear-down. ( Looking at you SMPPSim )
If supplied, the `callback` is called once the session is fully closed.

#### session.connect()
Can be used to reconnect a closed connection.

#### session.pause()
Can be used to postpone incoming pdu events untill calling `session.resume()`.

#### session.resume()
Resumes the session after a call to `pause()`.

#### Shortcut methods
For all smpp operations you can call methods with the same name as the operation
name, which is equivalent to createing a pdu instance and then sending it over
the session.

For example calling `session.submit_sm(options, callback)` is equivalent to:

``` javascript
var pdu = new smpp.PDU('submit_sm', options);
session.send(pdu, callback);
```

#### Event: 'connect'
Emitted when the session connection successfully is established.

#### Event: 'secureConnect'
The `secureConnect` event is emitted after the handshaking process for
a secure connection has successfully completed.

#### Event: 'close'
Emitted when the connection is fully closed.

#### Event: 'error' `(error)`
Emitted when an error occurs. The `'close'` event will be called directly
following this event.

#### Event: 'send' `(pdu)`
Emitted when a pdu is being sent over the session with the pdu as the argument.

#### Event: 'pdu' `(pdu)`
Emitted upon receiving a pdu.

#### Event: 'unknown' `(pdu)`
Emitted upon receiving an unknown pdu.

#### Shortcut events
When a pdu is received, after emitting the `'pdu'` event, an event with the same
name as the operation of that pdu will also be emitted.

### smpp.createServer([options], [sessionListener])
Creates a new SMPP server. The `sessionListener` argument is automatically set
as a listener for the 'session' event.
If options include `key` and `cert`, a TLS secured server will be created.

### smpp.Server
The base object for a SMPP server created with `smpp.createServer()`.
It is a child class of node's `net.Server`.

#### server.listen([port], [host], [callback])
Begin accepting connections on the specified `port` and `host`. If `port` is
omitted 2775 will be used. If the `host` is omitted, the server will accept
connections directed to any IPv4 address.

This function is asynchronous. The last parameter `callback` will be called when
the server has been bound.

#### Event: 'session' `(session)`
Emitted when a new session connection is established.
`session` is an instance of `smpp.Session`.

*for other server methods/events documentations see node's `net.Server` docs.*

### smpp.PDU
This is the base object for a PDU request or response.

#### new smpp.PDU(command, [options])
Creates a new PDU object with the specified `command` and `options`.

`options` is a list of parameters acceptable by the specified `command`.
The name of the parameters are equivalent to the names specified in SMPP
specification v5.0. The order of the parameters doesn't matter. If you don't
specify a required parameter in `options` a default value (usually null or 0 for
integers) will be used.

For the type of the parameters note the following rules:

* For `Integer` parameters (no matter what the length is) you must specify a
value of type `number` in JavaScript.
* For `Octet-String` and `COctet-String` parameters you can specify either a
`Buffer` or a `String`.
* For the fields that accept SMPP Time Format (`broadcast_end_time`,
`schedule_delivery_time`, `validity_period`, `final_date`) you can specify a
Javascript Date instance which will be automatically converted to a SMPP
absolute time string. For relative times you don't need to specify the whole
string, specifying a portion of it is enough. for example '0430' will be
converted to '000000000430000R'.
* For `short_message` and `message_payload` fields you can specify a buffer or a
string or an object containing `udh` and `message` properties, while `udh` is a
buffer and `message` is either a string or a buffer. strings will be
automatically encoded using ASCII, LATIN1, or UCS2 depending on their characters.
`data_coding` (if not specified) will be automatically set to 0x01, 0x03, or 0x08
for ASCII, LATIN1, and UCS2 encodings respectively. Also UDH indicator bit in
`esm_class` is automatically set if `udh` exists.
* `sm_length` parameter is not needed. It will be automatically set depending on
the length of the `short_message`.
* `dest_address` parameter in `submit_multi` operation must be an array of
objects containing either `dest_addr_ton`, `dest_addr_npi` and,
`destination_addr` properties or `dl_name` property for SME addresses or
Distribution Lists respectively.
* `unsuccess_sme` parameter in `submit_multi_resp` operation must be an array of
objects containing `dest_addr_ton`, `dest_addr_npi`, `destination_addr` and,
`error_status_code` properties.
* `number_of_dests` and `no_unsuccess` parameters are not needed. They will be
automatically set depending on the `dest_address` and `unsuccess_sme` parameters
respectively.
* TLV parameters which can be specified multiple times
(e.g. `broadcast_area_identifier`), must be specified as an array, even if you
want to specifiy just one item.

#### pdu.isResponse()
Returns `true` if the pdu is a response pdu, otherwise returns false;

#### pdu.response([options])
For a request pdu, calling `response()` creates and returns a response pdu for
that request.

For an unknown pdu, `response()` creates and returns a `generic_nack` pdu.

``` javascript
session.on('submit_sm', function(pdu) {
	var msgid = .... ; // generate a message_id for this message.
	session.send(pdu.response({
		message_id: msgid
	}));
});

session.on('unbind', function(pdu) {
	session.send(pdu.response());
	session.close();
});

session.on('enquire_link', function(pdu) {
	session.send(pdu.response());
});
```

Smpp web API container gateway sample (docker + smpp + express.js + Promise)
-------

api.js:
```javascript
const { parse } = require('querystring');
const Address4 = require("ip-address").Address4;
const crypto = require("crypto");
const json = { message: "OK" };

var appRouter = function (app, jsonParser) {
  
  app.get("/", function(req, res) {
    res.status(200).send({ message: "OK" });
  });

  app.post("/", jsonParser, function (req, res) {
    try
    {
      const ip = req.query["ip"];
      const port = req.query["port"];
      const phone = req.query["phone"];      
      const length = req.query["length"];
      const username = req.query["username"];
      const password = req.query["password"];
      const body = req.body;

      const jsonParameters = {};
      jsonParameters.ip = ip;
      jsonParameters.port = port;
      jsonParameters.phone = phone;
      jsonParameters.length = length;
      jsonParameters.username = username;
      jsonParameters.password = password;
      jsonParameters.body = body;

      let address;
      if (!(
        !!!ip || !!!ip.length || (ip.length <= 0) || (ip.length > 40) || !((address = new Address4(ip)).isValid()) || 
        !!!port || !!!port.length || (port.length <= 0) || (port.length > 4) || 
        !!!phone || !!!phone.length || !(phone.length === 11) || 
        !!!length || !!!length.length || (length.length < 1) || (length.length > 2) || parseInt(length) <= 3 || parseInt(length) > 16 ||
        !!!username || !!!username.length || (username.length <= 0) || (username.length > 16) || 
        !!!password || !!!password.length || (password.length <= 0) || (password.lengh > 16) || 
        !!!body || !!!body.message)) {

        const code_length = parseInt(length);
        const buf = crypto.randomBytes(256 * code_length);
        const possible = "0123456789";

        let code = "";
        for (var i = 0; i < code_length; i++)
          code += possible.charAt(buf[Math.floor(Math.random() * buf.length)] % possible.length);

        json.code = code;

        const smpp = require('smpp');
        const session = smpp.connect('smpp://' + ip + ':' + port);

        function bind_transceiver() {
          const bind_transceiver_promise = new Promise(function(resolve, reject) {
            session.bind_transceiver({
              system_id: username,
              password: password
            }, function(pdu) {
              if (pdu.command_status == 0) {
                resolve(pdu);
              } else {
                reject(pdu);
              }
            });
          });
          return bind_transceiver_promise;
        }

        function submit_sm() {
          const submit_sm_promise = new Promise(function(resolve, reject) {
            session.submit_sm({
              destination_addr: phone,
              short_message: body.message + ' ' + json.code
            }, function(pdu) {
                if (pdu.command_status == 0) {
                  resolve(pdu);
                } else {
                  reject(pdu);
                }
            });
          });
          return submit_sm_promise;
        }

        bind_transceiver().then(function(pdu) {
          submit_sm().then(function(pdu){
            session.close();
            json.json = JSON.stringify(pdu);
            res.status(200).send(json);
          }).catch(function(pdu){
            session.close();
            res.status(400).send({ message: 'Error', json: JSON.stringify(pdu) });
          });
        }).catch(function(pdu){
          session.close();
          json.json = JSON.stringify(pdu);
          res.status(400).send({ message: 'Error' });
        });
      } else {
        res.status(400).send({ message: 'Error', json: JSON.stringify(jsonParameters) });
      }
    } catch (ex) {
      res.status(400).send({ message: 'Error', json: JSON.stringify(ex) });
    } finally {
    }
  });
}

module.exports = appRouter;
```

app.js:
```javascript
var express = require("express");
var bodyParser = require("body-parser");
var api = require("./api");
var app = express();

// create application/json parser
var jsonParser = bodyParser.json();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

api(app, jsonParser);

var server = app.listen(3000, function () {
    console.log("listen at port ", server.address().port);
});
```

Dockerfile:
```docker
FROM node:lts-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If you are building your code for production
RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]
```

Roadmap
-------
* More test coverage.
* Add some usage examples (e.g client, server, and cluster examples)

License
-------
node-smpp is released under the MIT license.
