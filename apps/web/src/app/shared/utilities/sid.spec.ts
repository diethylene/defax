import { createSid, decodeSid, encodeSid } from './sid';

describe('sid', () => {
  it('creates 16 random bytes', () => {
    const sid = createSid();
    expect(sid).toBeInstanceOf(Uint8Array);
    expect(sid.length).toBe(16);
  });

  it('creates distinct values across calls', () => {
    expect(createSid()).not.toEqual(createSid());
  });

  it('round-trips through base64url', () => {
    const sid = createSid();
    expect(decodeSid(encodeSid(sid))).toEqual(sid);
  });

  it('encodes to unpadded base64url of 22 characters', () => {
    expect(encodeSid(createSid())).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('rejects a value that does not decode to 16 bytes', () => {
    expect(() => decodeSid('AAAA')).toThrow();
  });
});
