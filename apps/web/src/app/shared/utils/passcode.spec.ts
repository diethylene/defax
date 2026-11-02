import * as Option from 'effect/Option';
import { parsePasscode, parseReceiveCode } from './passcode';

describe('parsePasscode', () => {
  it('splits room id and password on the first hyphen', () => {
    expect(parsePasscode('123456-apple-bird')).toEqual({
      roomId: '123456',
      password: 'apple-bird',
    });
  });

  it('normalizes case and separators', () => {
    expect(parsePasscode(' 123456 Apple Bird ')).toEqual({
      roomId: '123456',
      password: 'apple-bird',
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
    expect(parseReceiveCode('123456-apple-orca')).toEqual(
      Option.some({
        roomId: '123456',
        password: 'apple-orca',
      }),
    );
  });

  it('normalizes case and separators', () => {
    expect(parseReceiveCode(' 123456 Apple ORCA ')).toEqual(
      Option.some({
        roomId: '123456',
        password: 'apple-orca',
      }),
    );
  });

  it('rejects a room id that is not six digits', () => {
    expect(parseReceiveCode('12345-apple-orca')).toEqual(Option.none());
    expect(parseReceiveCode('1234567-apple-orca')).toEqual(Option.none());
    expect(parseReceiveCode('abcdef-apple-orca')).toEqual(Option.none());
  });

  it('rejects a password that is not exactly two pgp words', () => {
    expect(parseReceiveCode('123456-apple')).toEqual(Option.none());
    expect(parseReceiveCode('123456-apple-orca-bird')).toEqual(Option.none());
    expect(parseReceiveCode('123456-apple-notaword')).toEqual(Option.none());
  });

  it('rejects malformed or empty input', () => {
    expect(parseReceiveCode('123456')).toEqual(Option.none());
    expect(parseReceiveCode('123456-')).toEqual(Option.none());
    expect(parseReceiveCode('-apple-orca')).toEqual(Option.none());
    expect(parseReceiveCode('')).toEqual(Option.none());
  });
});
