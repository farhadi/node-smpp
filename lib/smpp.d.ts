import { EventEmitter } from 'events';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { defs, PDU } from 'smpp';
import * as net from 'net';

declare module 'smpp' {
  type debugListener = (type: string, msg: string, payload: any) => void;

  interface sessionOptions {
    socket: Socket | TLSSocket;
    tls: boolean;
    connectTimeout: number;
    url: string;
    auto_enquire_link_period: number;
    debug: boolean;
    debugListener: debugListener;
  }

  interface serverOptions {
    isProxiedServer: boolean;
    key: string;
    cert: string;
    tls: boolean;
    debug: boolean;
    debugListener: debugListener;
  }

  type SessionPduEvent = keyof defs.Commands;
  type SessionPduParams<E extends SessionPduEvent> = PDU &
    defs.Commands[E]['params'];

  type PDUMethods = {
    [C in keyof defs.Commands]: (
      params: Partial<{ [P in keyof defs.Commands[C]['params']]: any }>,
      callback?: (pdu: PDU) => void,
    ) => void;
  };

  interface Session extends PDUMethods {}
  export declare class Session extends EventEmitter {
    options: Partial<sessionOptions>;
    sequence: number;
    paused: boolean;
    closed: boolean;
    remoteAddress: string | null;
    remotePort: string | null;
    proxyProtocolProxy: string | null;

    on<E extends SessionPduEvent>(
      event: E,
      pdu: (pdu?: SessionPduParams<E> | null) => void,
    );
    on(event: 'close', pdu: () => void);
    on(event: 'error', pdu: (pdu?: unknown) => void);
    on(event: 'unknown', pdu: (pdu?: unknown) => void);
    on(
      event: 'debug',
      pdu: (type: string, message: string, payload: string) => void,
    );

    connect(): void;
    pause(): void;
    resume(): void;
    close: (callback?: () => void) => void;
    destroy: (callback?: () => void) => void;
    send(
      pdu: PDU,
      responseCallback?: (callback: PDU) => void,
      sendCallback?: (callback: any) => void,
      failureCallback?: (callback: Error) => void,
    ): boolean;
  }

  export declare class Server extends net.Server {
    constructor(options: serverOptions, listener: (session: Session) => void);

    options: Partial<serverOptions>;
    isProxiedServer: boolean;
    tls: boolean;
    sessions: Session[];
  }

  export declare function SecureServer(
    options: Partial<serverOptions>,
    listener?: (session: Session) => void,
  ): void;

  export declare function ProxyServer(
    options: Partial<serverOptions>,
    listener?: (session: Session) => void,
  ): void;

  export declare function ProxySecureServer(
    options: Partial<serverOptions>,
    listener?: (session: Session) => void,
  ): void;

  export declare function createServer(
    options: Partial<serverOptions>,
    listener?: (session: Session) => void,
  ): net.Server;

  export declare function connect(
    options: Partial<sessionOptions>,
    listener?: (session: Session) => void,
  ): Session;

  export declare function addCommand(
    command: keyof defs.Commands,
    options: Record<string, any>,
  ): void;

  export declare function addTlv(
    tag: keyof defs.Tlvs,
    options: {
      id: number;
      type: defs.Type;
    },
  );
}
