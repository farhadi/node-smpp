import { Socket } from 'net';
import { defs } from 'smpp';

declare module 'smpp' {
  namespace PDU {
    type PduBaseParams = {
      command_length: number;
      command_id: number;
      command_status: number;
      sequence_number: number;
    };

    export declare class PDU {
      constructor(
        command: keyof defs.Commands | Buffer,
        options?: Record<string, any>,
      );

      command: string;
      command_length: number;
      command_id: number;
      command_status: number;
      sequence_number: number;

      static commandLength(stream: Socket): number | boolean;
      static fromStream(stream: Socket, command_length: number): PDU | boolean;
      static fromBuffer(buffer: Buffer): PDU | boolean;

      isResponse(): boolean;
      response(options?: Options): PDU;
      fromBuffer(buffer: Buffer): void;
      toBuffer(): Buffer;
    }
  }
  export = PDU;
}
