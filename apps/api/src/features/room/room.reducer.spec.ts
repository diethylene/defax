import { decodeSid, type Sid } from '@contract/signal/sid.model';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { admit, initialRoomState, type Occupancy, type RoomState, reduce } from './room.reducer';

/** A valid 16-byte session id, branded, reused across cases. */
const sid: Sid = Option.getOrThrow(
  decodeSid(Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(new Uint8Array(16))),
);

/** Both parties occupy the room. */
const both: Occupancy = { initiator: true, responder: true };

/**
 * Builds a room state in the given phase.
 * @param p The phase to set.
 * @returns The room state.
 */
const phase = (p: RoomState['phase']): RoomState => ({ phase: p });

describe('admit', () => {
  describe('success', () => {
    it('admits the initiator with a matching sid', () => {
      expect(admit('initiator', { initiator: false, responder: false }, sid, sid)).toEqual({
        _tag: 'admit',
      });
    });

    it('admits the responder without a sid', () => {
      expect(admit('responder', { initiator: true, responder: false }, sid, null)).toEqual({
        _tag: 'admit',
      });
    });
  });

  describe('invariants', () => {
    it('rejects the initiator with a mismatched sid', () => {
      expect(admit('initiator', { initiator: false, responder: false }, sid, 'other')).toEqual({
        _tag: 'reject',
        status: 403,
      });
    });

    it('rejects a second initiator', () => {
      expect(admit('initiator', { initiator: true, responder: false }, sid, sid)).toEqual({
        _tag: 'reject',
        status: 409,
      });
    });

    it('rejects a second responder', () => {
      expect(admit('responder', { initiator: true, responder: true }, sid, null)).toEqual({
        _tag: 'reject',
        status: 409,
      });
    });
  });
});

describe('reduce', () => {
  describe('success', () => {
    it('walks the full handshake to relay', () => {
      const waiting = initialRoomState;

      expect(
        reduce(
          waiting,
          { initiator: false, responder: false },
          { _tag: 'initiator-connected' },
          sid,
        ),
      ).toEqual({
        _tag: 'advance',
        state: waiting,
        outbound: [],
      });

      const joined = reduce(
        waiting,
        both,
        { _tag: 'message', role: 'responder', message: { type: 'join', protocol: 1 } },
        sid,
      );
      expect(joined).toEqual({
        _tag: 'advance',
        state: phase('pake'),
        outbound: [
          { to: 'responder', message: { type: 'joined', sid } },
          { to: 'initiator', message: { type: 'peer-joined' } },
        ],
      });

      const initiatorPake = reduce(
        phase('pake'),
        both,
        { _tag: 'message', role: 'initiator', message: { type: 'pake', y: 'y-initiator' } },
        sid,
      );
      expect(initiatorPake).toEqual({
        _tag: 'advance',
        state: phase('initiator-pake'),
        outbound: [{ to: 'responder', message: { type: 'pake', y: 'y-initiator' } }],
      });

      const responderPake = reduce(
        phase('initiator-pake'),
        both,
        { _tag: 'message', role: 'responder', message: { type: 'pake', y: 'y-responder' } },
        sid,
      );
      expect(responderPake).toEqual({
        _tag: 'advance',
        state: phase('relay'),
        outbound: [{ to: 'initiator', message: { type: 'pake', y: 'y-responder' } }],
      });

      const relay = reduce(
        phase('relay'),
        both,
        {
          _tag: 'message',
          role: 'initiator',
          message: { type: 'sealed', kind: 'rtc-offer', ct: 'ct' },
        },
        sid,
      );
      expect(relay).toEqual({
        _tag: 'advance',
        state: phase('relay'),
        outbound: [{ to: 'responder', message: { type: 'sealed', kind: 'rtc-offer', ct: 'ct' } }],
      });
    });

    it('notifies the initiator when it connects after the responder joined', () => {
      const result = reduce(
        phase('pake'),
        { initiator: false, responder: true },
        { _tag: 'initiator-connected' },
        sid,
      );
      expect(result).toEqual({
        _tag: 'advance',
        state: phase('pake'),
        outbound: [{ to: 'initiator', message: { type: 'peer-joined' } }],
      });
    });
  });

  describe('invariants', () => {
    it('kills on a join from the initiator', () => {
      expect(
        reduce(
          initialRoomState,
          both,
          { _tag: 'message', role: 'initiator', message: { type: 'join', protocol: 1 } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a duplicate join', () => {
      expect(
        reduce(
          phase('pake'),
          both,
          { _tag: 'message', role: 'responder', message: { type: 'join', protocol: 1 } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a protocol version mismatch', () => {
      expect(
        reduce(
          initialRoomState,
          both,
          { _tag: 'message', role: 'responder', message: { type: 'join', protocol: 2 } },
          sid,
        ),
      ).toEqual({
        _tag: 'kill',
        outbound: [{ to: 'responder', message: { type: 'error', code: 'protocol-mismatch' } }],
      });
    });

    it('kills on a pake before the responder joined', () => {
      expect(
        reduce(
          initialRoomState,
          { initiator: true, responder: false },
          { _tag: 'message', role: 'initiator', message: { type: 'pake', y: 'y' } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a sealed message before both pakes', () => {
      expect(
        reduce(
          phase('initiator-pake'),
          both,
          {
            _tag: 'message',
            role: 'initiator',
            message: { type: 'sealed', kind: 'rtc-offer', ct: 'ct' },
          },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a duplicate pake from the same role', () => {
      expect(
        reduce(
          phase('initiator-pake'),
          both,
          { _tag: 'message', role: 'initiator', message: { type: 'pake', y: 'y' } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a pake after relay started', () => {
      expect(
        reduce(
          phase('relay'),
          both,
          { _tag: 'message', role: 'initiator', message: { type: 'pake', y: 'y' } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills on a message from an unjoined role', () => {
      expect(
        reduce(
          phase('pake'),
          { initiator: false, responder: true },
          { _tag: 'message', role: 'initiator', message: { type: 'pake', y: 'y' } },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills and notifies the survivor on disconnect', () => {
      expect(
        reduce(initialRoomState, both, { _tag: 'peer-disconnected', role: 'initiator' }, sid),
      ).toEqual({
        _tag: 'kill',
        outbound: [{ to: 'responder', message: { type: 'error', code: 'peer-failed' } }],
      });
    });

    it('kills silently when the disconnecting peer was alone', () => {
      expect(
        reduce(
          initialRoomState,
          { initiator: true, responder: false },
          { _tag: 'peer-disconnected', role: 'initiator' },
          sid,
        ),
      ).toEqual({ _tag: 'kill', outbound: [] });
    });

    it('kills and notifies every peer on expiry', () => {
      expect(reduce(initialRoomState, both, { _tag: 'expired' }, sid)).toEqual({
        _tag: 'kill',
        outbound: [
          { to: 'initiator', message: { type: 'error', code: 'room-expired' } },
          { to: 'responder', message: { type: 'error', code: 'room-expired' } },
        ],
      });
    });
  });
});
