import { open, seal } from './aead';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const testKey = async (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

describe('aead', () => {
  it('seals and opens a message', async () => {
    const key = await testKey();
    const sealed = await seal(key, encoder.encode('hello defax'), '482913', 'initiator');
    const opened = await open(key, sealed, '482913', 'initiator');
    expect(decoder.decode(opened)).toBe('hello defax');
  });

  it('prepends a 12-byte nonce', async () => {
    const key = await testKey();
    const sealed = await seal(key, encoder.encode('hello'), '482913', 'initiator');
    // 12-byte nonce + 5-byte plaintext + 16-byte GCM tag.
    expect(sealed.length).toBe(12 + 5 + 16);
  });

  it('rejects a message opened with the wrong role', async () => {
    const key = await testKey();
    const sealed = await seal(key, encoder.encode('hello'), '482913', 'initiator');
    await expect(open(key, sealed, '482913', 'responder')).rejects.toThrow();
  });

  it('rejects a message opened with the wrong room id', async () => {
    const key = await testKey();
    const sealed = await seal(key, encoder.encode('hello'), '482913', 'initiator');
    await expect(open(key, sealed, '999999', 'initiator')).rejects.toThrow();
  });

  it('rejects tampered ciphertext', async () => {
    const key = await testKey();
    const sealed = await seal(key, encoder.encode('hello'), '482913', 'initiator');
    const tampered = sealed.map((byte, index) =>
      index === sealed.length - 1 ? byte ^ 0xff : byte,
    );
    await expect(open(key, tampered, '482913', 'initiator')).rejects.toThrow();
  });

  it('rejects a sealed message that is too short', async () => {
    const key = await testKey();
    await expect(open(key, new Uint8Array(27), '482913', 'initiator')).rejects.toThrow('too short');
  });
});
