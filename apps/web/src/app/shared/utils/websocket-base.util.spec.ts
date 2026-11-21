import { describe, expect, it } from 'vitest';
import { websocketBaseFrom } from './websocket-base.util';

describe('websocketBaseFrom', () => {
  describe('success', () => {
    it('swaps http for ws', () => {
      expect(websocketBaseFrom('http://api.example.test:8787')).toBe('ws://api.example.test:8787');
    });

    it('swaps https for wss', () => {
      expect(websocketBaseFrom('https://api.example.test')).toBe('wss://api.example.test');
    });

    it('drops a path from the API base URL', () => {
      expect(websocketBaseFrom('https://api.example.test/api')).toBe('wss://api.example.test');
    });
  });

  describe('invariants', () => {
    it('falls back to the current origin when the base URL is empty', () => {
      const scheme = window.location.protocol.replace('http', 'ws');

      expect(websocketBaseFrom('')).toBe(`${scheme}//${window.location.host}`);
    });
  });
});
