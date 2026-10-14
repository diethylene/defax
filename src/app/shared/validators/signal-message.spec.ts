import { createSid, encodeSid } from '../utils/sid';
import { signalMessageSchema } from './signal-message';

describe('signalMessageSchema', () => {
  it('accepts join, joined, and full', () => {
    expect(signalMessageSchema.safeParse({ type: 'join' }).success).toBe(true);
    expect(
      signalMessageSchema.safeParse({
        type: 'joined',
        sid: encodeSid(createSid())
      }).success
    ).toBe(true);
    expect(signalMessageSchema.safeParse({ type: 'full' }).success).toBe(true);
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
