import { describe, expect, it } from 'vitest';
import { generateRoomCode } from './room-code.util';

describe('generateRoomCode', () => {
  describe('success', () => {
    it('draws a six-digit room code', () => {
      expect(generateRoomCode()).toMatch(/^\d{6}$/);
    });
  });

  describe('invariants', () => {
    it('always draws six digits', () => {
      const codes = Array.from({ length: 200 }, generateRoomCode);

      expect(codes.every((code) => /^\d{6}$/.test(code))).toBe(true);
    });
  });
});
