import { parsePasscode } from './passcode';

describe('parsePasscode', () => {
  it('splits room id and password on the first hyphen', () => {
    expect(parsePasscode('123456-apple-bird')).toEqual({
      roomId: '123456',
      password: 'apple-bird'
    });
  });

  it('normalizes case and separators', () => {
    expect(parsePasscode(' 123456 Apple Bird ')).toEqual({
      roomId: '123456',
      password: 'apple-bird'
    });
  });

  it('rejects a code with no room id or password', () => {
    expect(() => parsePasscode('123456')).toThrow();
    expect(() => parsePasscode('123456-')).toThrow();
    expect(() => parsePasscode('-apple-bird')).toThrow();
  });
});
