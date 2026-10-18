import { createSid, encodeSid } from '../utilities/sid';
import { sidSchema } from './sid';

describe('sidSchema', () => {
  it('accepts a valid base64url sid', () => {
    expect(sidSchema.safeParse(encodeSid(createSid())).success).toBe(true);
  });

  it('rejects strings that do not decode to 16 bytes', () => {
    expect(sidSchema.safeParse('not base64!').success).toBe(false);
    expect(sidSchema.safeParse('AAAA').success).toBe(false);
  });
});
