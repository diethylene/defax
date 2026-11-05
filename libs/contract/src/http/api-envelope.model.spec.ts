import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { RoomCreated } from '../signal/room-created.model';
import { sidFromBytes } from '../signal/sid.model';
import { apiEnvelopeOf } from './api-envelope.model';

/** Valid response metadata. */
const meta = {
  requestId: '6f1c2a9e-0b7d-4a1e-9c3f-2d5b8e4a7c10',
  timestamp: '2026-11-04T10:00:00.000Z',
  apiVersion: '1',
};

/** A valid 16-byte session id. */
const SidValue = sidFromBytes(new Uint8Array(16));

describe('apiEnvelopeOf', () => {
  describe('success', () => {
    it('decodes data wrapped in the success envelope', () => {
      const Envelope = apiEnvelopeOf(Schema.String);

      const result = Schema.decodeUnknownOption(Envelope)({
        status: 'success',
        data: 'hello',
        meta,
      });

      expect(result).toEqual(Option.some({ status: 'success', data: 'hello', meta }));
    });

    it('decodes a validated payload inside the envelope', () => {
      const Envelope = apiEnvelopeOf(RoomCreated);
      const data = { roomId: '123456', sid: SidValue };

      const result = Schema.decodeUnknownOption(Envelope)({ status: 'success', data, meta });

      expect(result).toEqual(Option.some({ status: 'success', data, meta }));
    });
  });

  describe('invariants', () => {
    it('rejects a status other than success', () => {
      const Envelope = apiEnvelopeOf(Schema.String);

      const result = Schema.decodeUnknownOption(Envelope)({
        status: 'error',
        data: 'hello',
        meta,
      });

      expect(result).toEqual(Option.none());
    });

    it('rejects data that does not match the payload schema', () => {
      const Envelope = apiEnvelopeOf(RoomCreated);

      const result = Schema.decodeUnknownOption(Envelope)({
        status: 'success',
        data: { roomId: '123456', sid: 'AAAA' },
        meta,
      });

      expect(result).toEqual(Option.none());
    });

    it('rejects metadata with an empty api version', () => {
      const Envelope = apiEnvelopeOf(Schema.String);

      const result = Schema.decodeUnknownOption(Envelope)({
        status: 'success',
        data: 'hello',
        meta: { ...meta, apiVersion: '' },
      });

      expect(result).toEqual(Option.none());
    });
  });
});
