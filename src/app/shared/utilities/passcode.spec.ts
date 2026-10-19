import { parsePasscode, parseReceiveCode } from './passcode';

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

describe('parseReceiveCode', () => {
  it('accepts a six-digit room id and two pgp words', () => {
    expect(parseReceiveCode('123456-apple-orca')).toEqual({
      roomId: '123456',
      password: 'apple-orca'
    });
  });

  it('normalizes case and separators', () => {
    expect(parseReceiveCode(' 123456 Apple ORCA ')).toEqual({
      roomId: '123456',
      password: 'apple-orca'
    });
  });

  it('rejects a room id that is not six digits', () => {
    expect(parseReceiveCode('12345-apple-orca')).toBeNull();
    expect(parseReceiveCode('1234567-apple-orca')).toBeNull();
    expect(parseReceiveCode('abcdef-apple-orca')).toBeNull();
  });

  it('rejects a password that is not exactly two pgp words', () => {
    expect(parseReceiveCode('123456-apple')).toBeNull();
    expect(parseReceiveCode('123456-apple-orca-bird')).toBeNull();
    expect(parseReceiveCode('123456-apple-notaword')).toBeNull();
  });

  it('rejects malformed or empty input', () => {
    expect(parseReceiveCode('123456')).toBeNull();
    expect(parseReceiveCode('123456-')).toBeNull();
    expect(parseReceiveCode('-apple-orca')).toBeNull();
    expect(parseReceiveCode('')).toBeNull();
  });
});
