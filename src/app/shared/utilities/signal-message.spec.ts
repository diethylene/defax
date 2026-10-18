import { parseSignalMessage } from './signal-message';

describe('parseSignalMessage', () => {
  it('parses valid input and returns null otherwise', () => {
    expect(parseSignalMessage({ type: 'join', protocol: 1 })).toEqual({
      type: 'join',
      protocol: 1
    });
    expect(parseSignalMessage('garbage')).toBeNull();
  });
});
