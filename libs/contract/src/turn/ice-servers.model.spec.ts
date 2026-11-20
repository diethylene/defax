import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { IceServersResponse } from './ice-servers.model';

/** A valid generate-ice-servers body with one STUN and one TURN entry. */
const aPayload = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    {
      urls: ['turn:turn.cloudflare.com:3478?transport=udp'],
      username: 'user-1',
      credential: 'credential-1',
    },
  ],
};

const decode = Schema.decodeUnknownResult(IceServersResponse);

describe('IceServersResponse', () => {
  describe('success', () => {
    it('decodes a valid Cloudflare payload', () => {
      expect(decode(aPayload)).toEqual(Result.succeed(aPayload));
    });

    it('round-trips a valid payload', () => {
      const encoded = Schema.encodeSync(IceServersResponse)(
        Schema.decodeSync(IceServersResponse)(aPayload),
      );

      expect(encoded).toEqual(aPayload);
    });
  });

  describe('invariants', () => {
    it('rejects an entry without urls', () => {
      const payload = { iceServers: [{ username: 'user-1' }] };

      expect(Result.isFailure(decode(payload))).toBe(true);
    });

    it('rejects a non-string url', () => {
      const payload = { iceServers: [{ urls: [42] }] };

      expect(Result.isFailure(decode(payload))).toBe(true);
    });

    it('rejects a body without iceServers', () => {
      expect(Result.isFailure(decode({}))).toBe(true);
    });
  });
});
