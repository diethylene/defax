import { describe, expect, it } from 'vitest';
import { roomKeyFromPath } from './room-key.util';

describe('roomKeyFromPath', () => {
  describe('success', () => {
    it('extracts the key from an upgrade path', () => {
      expect(roomKeyFromPath('/rooms/123456/ws')).toBe('123456');
    });

    it('accepts a path without the leading slash', () => {
      expect(roomKeyFromPath('rooms/123456/ws')).toBe('123456');
    });
  });

  describe('invariants', () => {
    it('rejects the init path', () => {
      expect(roomKeyFromPath('/rooms/123456/init')).toBeNull();
    });

    it('rejects the create path', () => {
      expect(roomKeyFromPath('/rooms/create')).toBeNull();
    });

    it('rejects a room code named create', () => {
      expect(roomKeyFromPath('/rooms/create/ws')).toBeNull();
    });

    it('rejects the rooms root', () => {
      expect(roomKeyFromPath('/rooms')).toBeNull();
    });

    it('rejects a path with no action', () => {
      expect(roomKeyFromPath('/rooms/123456')).toBeNull();
    });

    it('rejects an unknown action', () => {
      expect(roomKeyFromPath('/rooms/123456/join')).toBeNull();
    });

    it('rejects extra segments', () => {
      expect(roomKeyFromPath('/rooms/123456/ws/extra')).toBeNull();
    });

    it('rejects an unrelated route', () => {
      expect(roomKeyFromPath('/api/health')).toBeNull();
    });
  });
});
