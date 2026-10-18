import { parseSignalMessage } from './signal-message';

describe('parseSignalMessage', () => {
  it('parses valid input and returns null otherwise', () => {
    expect(parseSignalMessage({ type: 'join' })).toEqual({ type: 'join' });
    expect(parseSignalMessage('garbage')).toBeNull();
  });
});
