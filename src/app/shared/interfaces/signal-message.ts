export type SignalMessage =
  | { type: 'join'; protocol: number }
  | { type: 'joined'; sid: string } // base64url wire form
  | { type: 'peer-joined' }
  | { type: 'pake'; y: string } // base64url, 32 bytes
  | {
      type: 'sealed';
      kind: 'peer-info' | 'file' | 'disconnect';
      ct: string; // base64url: nonce || ciphertext
    }
  | {
      type: 'error';
      code: 'room-full' | 'room-expired' | 'protocol-mismatch' | 'peer-failed';
    };
