declare module 'smpp' {
  namespace defs {
    type AvailableEncodings = 'ASCII' | 'LATIN1' | 'UCS2';
    type AvailableGSMCoder = 'GSM' | 'GSM_TR' | 'GSM_ES' | 'GSM_PT';
    type AvailableTypes =
      | 'int8'
      | 'int16'
      | 'int32'
      | 'string'
      | 'cstring'
      | 'buffer'
      | 'dest_address_array'
      | 'unsuccess_sme_array';

    type Gsmcoder = {
      chars: string;
      extCharsEnc?: string;
      escCharsEnc?: string;
      extCharsDec?: string;
      escCharsDec?: string;
      charRegex: string;
      charListEnc: object;
      extCharListEnc: object;
      charListDec: object;
      extCharListDec: object;
    };

    type Type = {
      read: <T>(buffer: Buffer, offset: number) => T;
      write: <T>(value: T, buffer: Buffer, offset: number) => void;
      size: <T>(value?: T) => number;
      default: any;
    };

    type TypeTlv = {
      read: (buffer: Buffer, offset: number, length: number) => string;
      write: <T>(value: T, buffer: Buffer, offset: number) => void;
      size: <T>(value: T) => number;
      default: any;
    };

    type Encoder = {
      match(value: string): boolean;
      encode(value: string): Buffer;
      decode(value: Buffer): string;
    };

    type Filter<EV, ER, DV, DR> = {
      encode(value: EV): ER;
      decode(value: DV, skipUdh?: boolean): DR;
    };

    type Encodings = {
      [K in AvailableEncodings]: Encoder;
    };

    type BufferReturn = {
      format: number;
      data: string | Buffer;
    };

    type MessageEncode = {
      message: string;
      udh?: Buffer;
    };

    type MessageDecode = {
      message: string | Buffer;
      udh?: Buffer[];
    };

    type BroadcastContent = {
      network: number;
      content_type: number;
    };

    type BroadcastFrequency = {
      unit: number;
      interval: number;
    };

    type CallbackNum = {
      digit_mode: number;
      ton: number;
      npi: number;
      number: string;
    };

    type CallbackNumAtaEncode = {
      encoding: number;
      display: string | Buffer;
    };

    type CallbackNumAtaDencode = {
      encoding: number;
      display: Buffer;
    };

    type Filters = {
      time: Filter<
        string | Date | undefined | null,
        string | undefined | null,
        string | undefined | null,
        Date | string | undefined | null
      >;
      message: Filter<
        Buffer | string | Message,
        Buffer | string,
        Buffer,
        MessageDecode | Buffer
      >;
      billing_identification: Filter<
        Buffer | BufferReturn,
        Buffer,
        Buffer,
        BufferReturn | Buffer
      >;
      broadcast_area_identifier: Filter<
        Buffer | string | BufferReturn,
        Buffer,
        Buffer,
        BufferReturn | Buffer
      >;
      broadcast_content_type: Filter<
        Buffer | BroadcastContent,
        Buffer,
        Buffer,
        BroadcastContent | Buffer
      >;
      broadcast_frequency_interval: Filter<
        Buffer | BroadcastFrequency,
        Buffer,
        Buffer,
        BroadcastFrequency | Buffer
      >;
      callback_num: Filter<
        Buffer | Partial<CallbackNum>,
        Buffer,
        Buffer,
        CallbackNum | Buffer
      >;
      callback_num_atag: Filter<
        Buffer | CallbackNumAtaEncode,
        Buffer,
        Buffer,
        CallbackNumAtaDencode | Buffer
      >;
    };

    type GsmCoders = {
      [K in AvailableGSMCoder]: Gsmcoder;
    };

    type consts = {
      REGISTERED_DELIVERY: {
        FINAL: number;
        FAILURE: number;
        SUCCESS: number;
        DELIVERY_ACKNOWLEDGEMENT: number;
        USER_ACKNOWLEDGEMENT: number;
        INTERMEDIATE: number;
      };
      ESM_CLASS: {
        DATAGRAM: number;
        FORWARD: number;
        STORE_FORWARD: number;
        MC_DELIVERY_RECEIPT: number;
        DELIVERY_ACKNOWLEDGEMENT: number;
        USER_ACKNOWLEDGEMENT: number;
        CONVERSATION_ABORT: number;
        INTERMEDIATE_DELIVERY: number;
        UDH_INDICATOR: number;
        KANNEL_UDH_INDICATOR: number;
        SET_REPLY_PATH: number;
      };
      MESSAGE_STATE: {
        SCHEDULED: number;
        ENROUTE: number;
        DELIVERED: number;
        EXPIRED: number;
        DELETED: number;
        UNDELIVERABLE: number;
        ACCEPTED: number;
        UNKNOWN: number;
        REJECTED: number;
        SKIPPED: number;
      };
      TON: {
        UNKNOWN: number;
        INTERNATIONAL: number;
        NATIONAL: number;
        NETWORK_SPECIFIC: number;
        SUBSCRIBER_NUMBER: number;
        ALPHANUMERIC: number;
        ABBREVIATED: number;
      };
      NPI: {
        UNKNOWN: number;
        ISDN: number;
        DATA: number;
        TELEX: number;
        LAND_MOBILE: number;
        NATIONAL: number;
        PRIVATE: number;
        ERMES: number;
        INTERNET: number;
        IP: number;
        WAP: number;
      };
      ENCODING: {
        SMSC_DEFAULT: number;
        ASCII: number;
        GSM_TR: number;
        GSM_ES: number;
        GSM_PT: number;
        IA5: number;
        LATIN1: number;
        ISO_8859_1: number;
        BINARY: number;
        JIS: number;
        X_0208_1990: number;
        CYRILLIC: number;
        ISO_8859_5: number;
        HEBREW: number;
        ISO_8859_8: number;
        UCS2: number;
        PICTOGRAM: number;
        ISO_2022_JP: number;
        EXTENDED_KANJI_JIS: number;
        X_0212_1990: number;
        KS_C_5601: number;
      };
      NETWORK: {
        GENERIC: number;
        GSM: number;
        TDMA: number;
        CDMA: number;
      };
      BROADCAST_AREA_FORMAT: {
        NAME: number;
        ALIAS: number;
        ELLIPSOID_ARC: number;
        POLYGON: number;
      };
      BROADCAST_FREQUENCY_INTERVAL: {
        MAX_POSSIBLE: number;
        SECONDS: number;
        MINUTES: number;
        HOURS: number;
        DAYS: number;
        WEEKS: number;
        MONTHS: number;
        YEARS: number;
      };
    };

    type Types = {
      [K in AvailableTypes]: Type;
    };

    type TypesTlv = {
      int8: Types['int8'];
      int16: Types['int16'];
      int32: Types['int32'];
      cstring: Types['cstring'];
      string: TypesTlv;
      buffer: TypesTlv;
    };

    type Commands = {
      alert_notification: {
        id: number;
        params: {
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          esme_addr_ton: { type: Types['int8'] };
          esme_addr_npi: { type: Types['int8'] };
          esme_addr: { type: Types['cstring'] };
        };
      };
      bind_receiver: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
          password: { type: Types['cstring'] };
          system_type: { type: Types['cstring'] };
          interface_version: { type: Types['int8']; default: number };
          addr_ton: { type: Types['int8'] };
          addr_npi: { type: Types['int8'] };
          address_range: { type: Types['cstring'] };
        };
      };
      bind_receiver_resp: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
        };
      };
      bind_transmitter: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
          password: { type: Types['cstring'] };
          system_type: { type: Types['cstring'] };
          interface_version: { type: Types['int8']; default: number };
          addr_ton: { type: Types['int8'] };
          addr_npi: { type: Types['int8'] };
          address_range: { type: Types['cstring'] };
        };
      };
      bind_transmitter_resp: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
        };
      };
      bind_transceiver: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
          password: { type: Types['cstring'] };
          system_type: { type: Types['cstring'] };
          interface_version: { type: Types['int8']; default: number };
          addr_ton: { type: Types['int8'] };
          addr_npi: { type: Types['int8'] };
          address_range: { type: Types['cstring'] };
        };
      };
      bind_transceiver_resp: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
        };
      };
      broadcast_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          message_id: { type: Types['cstring'] };
          priority_flag: { type: Types['int8'] };
          schedule_delivery_time: {
            type: Types['cstring'];
            filter: Filters['time'];
          };
          validity_period: { type: Types['cstring']; filter: Filters['time'] };
          replace_if_present_flag: { type: Types['int8'] };
          data_coding: { type: Types['int8']; default: null };
          sm_default_msg_id: { type: Types['int8'] };
        };
      };
      broadcast_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
        };
        tlvMap: {
          broadcast_area_identifier: 'failed_broadcast_area_identifier';
        };
      };
      cancel_broadcast_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          message_id: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
        };
      };
      cancel_broadcast_sm_resp: {
        id: number;
      };
      cancel_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          message_id: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          dest_addr_ton: { type: Types['int8'] };
          dest_addr_npi: { type: Types['int8'] };
          destination_addr: { type: Types['cstring'] };
        };
      };
      cancel_sm_resp: {
        id: number;
      };
      data_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          dest_addr_ton: { type: Types['int8'] };
          dest_addr_npi: { type: Types['int8'] };
          destination_addr: { type: Types['cstring'] };
          esm_class: { type: Types['int8'] };
          registered_delivery: { type: Types['int8'] };
          data_coding: { type: Types['int8']; default: null };
        };
      };
      data_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
        };
      };
      deliver_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          dest_addr_ton: { type: Types['int8'] };
          dest_addr_npi: { type: Types['int8'] };
          destination_addr: { type: Types['cstring'] };
          esm_class: { type: Types['int8'] };
          protocol_id: { type: Types['int8'] };
          priority_flag: { type: Types['int8'] };
          schedule_delivery_time: {
            type: Types['cstring'];
            filter: Filters['time'];
          };
          validity_period: { type: Types['cstring']; filter: Filters['time'] };
          registered_delivery: { type: Types['int8'] };
          replace_if_present_flag: { type: Types['int8'] };
          data_coding: { type: Types['int8']; default: null };
          sm_default_msg_id: { type: Types['int8'] };
          short_message: { type: Types['buffer']; filter: Filters['message'] };
        };
      };
      deliver_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
        };
      };
      enquire_link: {
        id: number;
      };
      enquire_link_resp: {
        id: number;
      };
      generic_nack: {
        id: number;
      };
      outbind: {
        id: number;
        params: {
          system_id: { type: Types['cstring'] };
          password: { type: Types['cstring'] };
        };
      };
      query_broadcast_sm: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
        };
      };
      query_broadcast_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
        };
      };
      query_sm: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
        };
      };
      query_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
          final_date: { type: Types['cstring']; filter: Filters['time'] };
          message_state: { type: Types['int8'] };
          error_code: { type: Types['int8'] };
        };
      };
      replace_sm: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          schedule_delivery_time: {
            type: Types['cstring'];
            filter: Filters['time'];
          };
          validity_period: { type: Types['cstring']; filter: Filters['time'] };
          registered_delivery: { type: Types['int8'] };
          sm_default_msg_id: { type: Types['int8'] };
          short_message: { type: Types['buffer']; filter: Filters['message'] };
        };
      };
      replace_sm_resp: {
        id: number;
      };
      submit_multi: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          dest_address: { type: Types['dest_address_array'] };
          esm_class: { type: Types['int8'] };
          protocol_id: { type: Types['int8'] };
          priority_flag: { type: Types['int8'] };
          schedule_delivery_time: {
            type: Types['cstring'];
            filter: Filters['time'];
          };
          validity_period: { type: Types['cstring']; filter: Filters['time'] };
          registered_delivery: { type: Types['int8'] };
          replace_if_present_flag: { type: Types['int8'] };
          data_coding: { type: Types['int8']; default: null };
          sm_default_msg_id: { type: Types['int8'] };
          short_message: { type: Types['buffer']; filter: Filters['message'] };
        };
      };
      submit_multi_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
          unsuccess_sme: { type: Types['unsuccess_sme_array'] };
        };
      };
      submit_sm: {
        id: number;
        params: {
          service_type: { type: Types['cstring'] };
          source_addr_ton: { type: Types['int8'] };
          source_addr_npi: { type: Types['int8'] };
          source_addr: { type: Types['cstring'] };
          dest_addr_ton: { type: Types['int8'] };
          dest_addr_npi: { type: Types['int8'] };
          destination_addr: { type: Types['cstring'] };
          esm_class: { type: Types['int8'] };
          protocol_id: { type: Types['int8'] };
          priority_flag: { type: Types['int8'] };
          schedule_delivery_time: {
            type: Types['cstring'];
            filter: Filters['time'];
          };
          validity_period: { type: Types['cstring']; filter: Filters['time'] };
          registered_delivery: { type: Types['int8'] };
          replace_if_present_flag: { type: Types['int8'] };
          data_coding: { type: Types['int8']; default: null };
          sm_default_msg_id: { type: Types['int8'] };
          short_message: { type: Types['buffer']; filter: Filters['message'] };
        };
      };
      submit_sm_resp: {
        id: number;
        params: {
          message_id: { type: Types['cstring'] };
        };
      };
      unbind: {
        id: number;
      };
      unbind_resp: {
        id: number;
      };
    };

    type CommandsById = number;

    type Tlvs = {
      dest_addr_subunit: {
        id: number;
        type: TypesTlv['int8'];
      };
      dest_network_type: {
        id: number;
        type: TypesTlv['int8'];
      };
      dest_bearer_type: {
        id: number;
        type: TypesTlv['int16'];
      };
      dest_telematics_id: {
        id: number;
        type: TypesTlv['int16'];
      };
      source_addr_subunit: {
        id: number;
        type: TypesTlv['int8'];
      };
      source_network_type: {
        id: number;
        type: TypesTlv['int8'];
      };
      source_bearer_type: {
        id: number;
        type: TypesTlv['int8'];
      };
      source_telematics_id: {
        id: number;
        type: TypesTlv['int16'];
      };
      qos_time_to_live: {
        id: number;
        type: TypesTlv['int32'];
      };
      payload_type: {
        id: number;
        type: TypesTlv['int8'];
      };
      additional_status_info_text: {
        id: number;
        type: TypesTlv['cstring'];
      };
      receipted_message_id: {
        id: number;
        type: TypesTlv['cstring'];
      };
      ms_msg_wait_facilities: {
        id: number;
        type: TypesTlv['int8'];
      };
      privacy_indicator: {
        id: number;
        type: TypesTlv['int8'];
      };
      source_subaddress: {
        id: number;
        type: TypesTlv['buffer'];
      };
      dest_subaddress: {
        id: number;
        type: TypesTlv['buffer'];
      };
      user_message_reference: {
        id: number;
        type: TypesTlv['int16'];
      };
      user_response_code: {
        id: number;
        type: TypesTlv['int8'];
      };
      source_port: {
        id: number;
        type: TypesTlv['int16'];
      };
      dest_port: {
        id: number;
        type: TypesTlv['int16'];
      };
      sar_msg_ref_num: {
        id: number;
        type: TypesTlv['int16'];
      };
      language_indicator: {
        id: number;
        type: TypesTlv['int8'];
      };
      sar_total_segments: {
        id: number;
        type: TypesTlv['int8'];
      };
      sar_segment_seqnum: {
        id: number;
        type: TypesTlv['int8'];
      };
      sc_interface_version: {
        id: number;
        type: TypesTlv['int8'];
      };
      callback_num_pres_ind: {
        id: number;
        type: TypesTlv['int8'];
        multiple: true;
      };
      callback_num_atag: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['callback_num_atag'];
        multiple: true;
      };
      number_of_messages: {
        id: number;
        type: TypesTlv['int8'];
      };
      callback_num: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['callback_num'];
        multiple: true;
      };
      dpf_result: {
        id: number;
        type: TypesTlv['int8'];
      };
      set_dpf: {
        id: number;
        type: TypesTlv['int8'];
      };
      ms_availability_status: {
        id: number;
        type: TypesTlv['int8'];
      };
      network_error_code: {
        id: number;
        type: TypesTlv['buffer'];
      };
      message_payload: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['message'];
      };
      delivery_failure_reason: {
        id: number;
        type: TypesTlv['int8'];
      };
      more_messages_to_send: {
        id: number;
        type: TypesTlv['int8'];
      };
      message_state: {
        id: number;
        type: TypesTlv['int8'];
      };
      congestion_state: {
        id: number;
        type: TypesTlv['int8'];
      };
      ussd_service_op: {
        id: number;
        type: TypesTlv['int8'];
      };
      broadcast_channel_indicator: {
        id: number;
        type: TypesTlv['int8'];
      };
      broadcast_content_type: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['broadcast_content_type'];
      };
      broadcast_content_type_info: {
        id: number;
        type: TypesTlv['string'];
      };
      broadcast_message_class: {
        id: number;
        type: TypesTlv['int8'];
      };
      broadcast_rep_num: {
        id: number;
        type: TypesTlv['int16'];
      };
      broadcast_frequency_interval: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['broadcast_frequency_interval'];
      };
      broadcast_area_identifier: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['broadcast_area_identifier'];
        multiple: true;
      };
      broadcast_error_status: {
        id: number;
        type: TypesTlv['int32'];
        multiple: true;
      };
      broadcast_area_success: {
        id: number;
        type: TypesTlv['int8'];
      };
      broadcast_end_time: {
        id: number;
        type: TypesTlv['string'];
        filter: Filters['time'];
      };
      broadcast_service_group: {
        id: number;
        type: TypesTlv['string'];
      };
      billing_identification: {
        id: number;
        type: TypesTlv['buffer'];
        filter: Filters['billing_identification'];
      };
      source_network_id: {
        id: number;
        type: TypesTlv['cstring'];
      };
      dest_network_id: {
        id: number;
        type: TypesTlv['cstring'];
      };
      source_node_id: {
        id: number;
        type: TypesTlv['string'];
      };
      dest_node_id: {
        id: number;
        type: TypesTlv['string'];
      };
      dest_addr_np_resolution: {
        id: number;
        type: TypesTlv['int8'];
      };
      dest_addr_np_information: {
        id: number;
        type: TypesTlv['string'];
      };
      dest_addr_np_country: {
        id: number;
        type: TypesTlv['int32'];
      };
      display_time: {
        id: number;
        type: TypesTlv['int8'];
      };
      sms_signal: {
        id: number;
        type: TypesTlv['int16'];
      };
      ms_validity: {
        id: number;
        type: TypesTlv['buffer'];
      };
      alert_on_message_delivery: {
        id: number;
        type: TypesTlv['int8'];
      };
      its_reply_type: {
        id: number;
        type: TypesTlv['int8'];
      };
      its_session_info: {
        id: number;
        type: TypesTlv['buffer'];
      };
    };

    type TlvsById = number;

    export const encodings: Encodings;
    export const filters: Filters;
    export const gsmCoder: GsmCoders;
    export const consts: consts;
    export const commands: Commands;
    export const commandsById: CommandsById;
    export const types: Types;
    export const tlvs: Tlvs;
    export const tlvsById: TlvsById;
  }
}
