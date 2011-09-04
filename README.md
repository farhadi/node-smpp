node-smpp
=========
SMPP client and server implementation in node.js.


Installation
------------

    npm install smpp

Usage
-----
### Creating a SMPP session

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

### Creating a SMPP server

    var smpp = require('smpp');
    var server = smpp.createServer(function(session) {
        session.on('bind_transceiver', function(pdu) {
            // we pause the session to prevent further incoming pdu events,
            // untill we authorize the session with some async operation.
            session.pause();
            checkAsyncUserPass(pdu.system_id, pdu.password, function(err) {
                if (err) {
                    session.send(pdu.response({
                        command_status: 0x0E // ESME_RINVPASWD (Invaid Password)
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
If the `pdu` is a request pdu, when the relevant respose is received, the
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

    var pdu = new smpp.PDU('submit_sm', options);
    session.send(pdu, callback);

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

### smpp.PDU
This is the base object for a PDU request or response.

#### new smpp.PDU(command, [options])
Creates a new PDU object with the specified `command` and `options`.
`options` is a list of parameters acceptable by the specified `command`.

#### pdu.isResponse()
Returns `true` if the pdu is response pdu, otherwise returns false;

#### pdu.response([options])
For a request pdu, calling `response()` creates and returns a response pdu for
that request.

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

Roadmap
-------
TLV options is not implemented yet.
It will eventually be a complete implementation of SMPP v5.0.

License
-------
node-smpp is released under the MIT license.
