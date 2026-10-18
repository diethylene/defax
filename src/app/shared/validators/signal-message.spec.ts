import { encodeBase64Url } from '../utilities/base64url';
import { createSid, encodeSid } from '../utilities/sid';
import { signalMessageSchema } from './signal-message';

const pakeY = encodeBase64Url(new Uint8Array(32).fill(1));

describe('signalMessageSchema', () => {
  it('accepts join, joined, peer-joined, pake, sealed, and error', () => {
    expect(
      signalMessageSchema.safeParse({ type: 'join', protocol: 1 }).success
    ).toBe(true);
    expect(
      signalMessageSchema.safeParse({
        type: 'joined',
        sid: encodeSid(createSid())
      }).success
    ).toBe(true);
    expect(signalMessageSchema.safeParse({ type: 'peer-joined' }).success).toBe(
      true
    );
    expect(
      signalMessageSchema.safeParse({ type: 'pake', y: pakeY }).success
    ).toBe(true);
    expect(
      signalMessageSchema.safeParse({ type: 'sealed', ct: 'abc' }).success
    ).toBe(true);
    expect(
      signalMessageSchema.safeParse({ type: 'error', code: 'room-full' })
        .success
    ).toBe(true);
  });

  it('rejects a pake key that is not 32 bytes', () => {
    expect(
      signalMessageSchema.safeParse({ type: 'pake', y: 'AAAA' }).success
    ).toBe(false);
  });

  it('rejects unknown types and malformed joined messages', () => {
    expect(signalMessageSchema.safeParse({ type: 'nope' }).success).toBe(false);
    expect(signalMessageSchema.safeParse({ type: 'joined' }).success).toBe(
      false
    );
    expect(
      signalMessageSchema.safeParse({ type: 'joined', sid: 'junk' }).success
    ).toBe(false);
  });
});
