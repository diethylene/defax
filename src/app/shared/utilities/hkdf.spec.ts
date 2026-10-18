import { deriveSessionKeys, formatSas } from './hkdf';

const encoder = new TextEncoder();

describe('formatSas', () => {
  it('formats 32 bits as a zero-padded 6-digit number', () => {
    expect(formatSas(new Uint8Array([0x00, 0x00, 0x00, 0x2a]))).toBe('000042');
    expect(formatSas(new Uint8Array([0xff, 0xff, 0xff, 0xff]))).toBe('967295');
    expect(formatSas(new Uint8Array([0x00, 0x0f, 0x42, 0x40]))).toBe('000000');
  });
});

describe('deriveSessionKeys', () => {
  it('derives a non-extractable AES-GCM key and a SAS string', async () => {
    const { signalingKey, sas } = await deriveSessionKeys(
      new Uint8Array(64).fill(1),
      new Uint8Array(16).fill(2)
    );
    expect(signalingKey.extractable).toBe(false);
    expect(signalingKey.algorithm.name).toBe('AES-GCM');
    expect(sas).toMatch(/^\d+$/);
  });

  it('zeroes the isk after importing', async () => {
    const isk = new Uint8Array(64).fill(1);
    await deriveSessionKeys(isk, new Uint8Array(16).fill(2));
    expect(Array.from(isk).every((byte) => byte === 0)).toBe(true);
  });

  it('derives the same SAS for the same inputs', async () => {
    const sid = new Uint8Array(16).fill(3);
    const first = await deriveSessionKeys(new Uint8Array(64).fill(4), sid);
    const second = await deriveSessionKeys(new Uint8Array(64).fill(4), sid);
    expect(first.sas).toBe(second.sas);
  });

  it('signaling key encrypts and decrypts', async () => {
    const { signalingKey } = await deriveSessionKeys(
      new Uint8Array(64).fill(5),
      new Uint8Array(16).fill(6)
    );
    const data = encoder.encode('defax');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      signalingKey,
      data
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      signalingKey,
      encrypted
    );
    expect(new TextDecoder().decode(decrypted)).toBe('defax');
  });
});
