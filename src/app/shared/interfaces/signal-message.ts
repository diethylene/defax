export type SignalMessage =
  | { type: 'join' }
  | { type: 'joined'; sid: string } // base64url wire form
  | { type: 'full' };
