node-smpp
=========
SMPP client and server implementation in node.js.

[![Flattr this git repo](http://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=farhadi&url=https://github.com/farhadi/node-smpp&title=node-smpp&language=en_GB&tags=github&category=software)

Introduction
------------
This is a complete implementation of SMPP v5.0 in node.js, with support for
custom commands and tlvs.

The name of the methods and parameters in this implementation are equivalent to
the names defined in SMPP specification. So get a copy of
[SMPP v5.0 Specification](http://www.smsforum.net/smppv50.pdf.zip)
for a list of available operations and their parameters.

Installation
------------

    npm install smpp

Note that it only works on node 0.5.5 and higher.

Usage
-----
### Creating a SMPP session

``` javascript
    var smpp = require('smpp');
    var session = smpp.createSession('example.com', 2775);
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
                        command_status: smpp.ESME_RINVPASWD // (Invaid Password)
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

API
-------

### smpp.createSession([host], [port])
Creates a new smpp session to the given `host` and `port`. If `port` is omited,
the default smpp port (2775) will be used. If `host` is also omitted, `localhost`
will be assumed.

### smpp.Session
This is the base object for a SMPP session. sessions can be created by calling
`smpp.createSession()` or can be created by a smpp server when a client
establishes a connection to the server. In this case the server passes the
session object to the `'session'` event listener.

#### session.send(pdu, [callback])
Sends a pdu request/response to the MC/ESME over the session.
The `pdu` is an instance of `smpp.PDU` which might be either a response or
request pdu.

When sending a request pdu, `pdu.sequence_number` will be automatically set to
the proper value.

If the `pdu` is a request pdu, when the relevant response is received, the
optional `callback` parameter will be invoked with the response pdu passed to it.

#### session.close()
Closes the current session connection.

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

#### Event: 'close'
Emitted when the conntion is fully closed.

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

### smpp.createServer([sessionListener])
Creates a new SMPP server. The `sessionListener` argument is automatically set
as a listener for the 'session' event.

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
automatically encoded using ucs2 or ascii depending on their characters. Also
`data_coding` (if not specified) will be automatically set to 0x01 or 0x08 for
ascii and ucs2 encodings respectively. Also UDH indicator bit in `esm_class`
is automatically set if `udh` exists.
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

Roadmap
-------
* Support for secure sessions using TLS.
* More test coverage.

License
-------
node-smpp is released under the MIT license.
