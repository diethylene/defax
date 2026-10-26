import type { ErrorCode } from '@contract/signal/error-code.model';
import type { InboundMessage, OutboundMessage } from '@contract/signal/message.model';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';
import type { Sid } from '@contract/signal/sid.model';
import * as Match from 'effect/Match';
import { opposite, type Role } from './role.model';

/** The signaling phases a room moves through. */
export type Phase = 'waiting' | 'pake' | 'initiator-pake' | 'responder-pake' | 'relay';

/** The room's phase, the only state the machine keeps. */
export interface RoomState {
  /** Current phase of the handshake. */
  readonly phase: Phase;
}

/** A room that has not started its handshake yet. */
export const initialRoomState: RoomState = { phase: 'waiting' };

/** Which roles currently hold a connection. */
export interface Occupancy {
  /** Whether the initiator is connected. */
  readonly initiator: boolean;
  /** Whether the responder is connected. */
  readonly responder: boolean;
}

/** Roles in a stable order, so outbound fan-out is deterministic. */
const ROLES: readonly Role[] = ['initiator', 'responder'];

/** Something that happened to the room. */
export type RoomEvent =
  | { readonly _tag: 'initiator-connected' }
  | { readonly _tag: 'responder-connected' }
  | { readonly _tag: 'message'; readonly role: Role; readonly message: InboundMessage }
  | { readonly _tag: 'peer-disconnected'; readonly role: Role }
  | { readonly _tag: 'expired' };

/** A message addressed to one party. */
export interface Outbound {
  /** Recipient of the message. */
  readonly to: Role;
  /** Message to send. */
  readonly message: OutboundMessage;
}

/** The outcome of feeding one event to the room. */
export type Step =
  | {
      readonly _tag: 'advance';
      readonly state: RoomState;
      readonly outbound: readonly Outbound[];
    }
  | { readonly _tag: 'kill'; readonly outbound: readonly Outbound[] };

/** The outcome of a connection attempting to enter the room. */
export type AdmitResult =
  | { readonly _tag: 'admit' }
  | { readonly _tag: 'reject'; readonly status: 403 | 409 };

/**
 * Builds an advancing step.
 * @param state The state after the transition.
 * @param outbound Messages to send because of the transition.
 * @returns The advancing step.
 */
const advance = (state: RoomState, outbound: readonly Outbound[] = []): Step => ({
  _tag: 'advance',
  state,
  outbound,
});

/**
 * Builds a killing step.
 * @param outbound Messages to send before the room closes.
 * @returns The killing step.
 */
const kill = (outbound: readonly Outbound[] = []): Step => ({ _tag: 'kill', outbound });

/**
 * Builds an error message for one party.
 * @param to Recipient of the error.
 * @param code Relay-level error code.
 * @returns The outbound error.
 */
const error = (to: Role, code: ErrorCode): Outbound => ({
  to,
  message: { type: 'error', code },
});

/** Tells the initiator the responder has arrived. */
const PEER_JOINED: Outbound = { to: 'initiator', message: { type: 'peer-joined' } };

/**
 * Decides whether a connection may enter the room.
 * @param role Role the connection claims.
 * @param occupancy Roles already connected.
 * @param storedSid Session id the room issued.
 * @param presentedSid Session id the connection presents, when it has one.
 * @returns Whether the connection is admitted.
 */
export const admit = (
  role: Role,
  occupancy: Occupancy,
  storedSid: string,
  presentedSid: string | null,
): AdmitResult =>
  Match.value(role).pipe(
    Match.when('initiator', () => admitInitiator(occupancy, storedSid, presentedSid)),
    Match.when('responder', () => admitResponder(occupancy)),
    Match.exhaustive,
  );

/**
 * Applies the initiator admission rules.
 * @param occupancy Roles already connected.
 * @param storedSid Session id the room issued.
 * @param presentedSid Session id the connection presents, when it has one.
 * @returns Whether the initiator is admitted.
 */
const admitInitiator = (
  occupancy: Occupancy,
  storedSid: string,
  presentedSid: string | null,
): AdmitResult => {
  if (occupancy.initiator) return { _tag: 'reject', status: 409 };
  if (presentedSid !== storedSid) return { _tag: 'reject', status: 403 };
  return { _tag: 'admit' };
};

/**
 * Applies the responder admission rules.
 * @param occupancy Roles already connected.
 * @returns Whether the responder is admitted.
 */
const admitResponder = (occupancy: Occupancy): AdmitResult => {
  if (occupancy.responder) return { _tag: 'reject', status: 409 };
  return { _tag: 'admit' };
};

/**
 * Feeds one event to the room and returns the next step.
 * @param state Current room state.
 * @param occupancy Roles currently connected.
 * @param event The event to apply.
 * @param sid Session id echoed to the responder on join.
 * @returns The next step, either advancing or killing the room.
 */
export const reduce = (state: RoomState, occupancy: Occupancy, event: RoomEvent, sid: Sid): Step =>
  Match.value(event).pipe(
    Match.tag('initiator-connected', () => onInitiatorConnected(state)),
    Match.tag('responder-connected', () => advance(state)),
    Match.tag('message', (e) => onMessage(state, occupancy, e.role, e.message, sid)),
    Match.tag('peer-disconnected', (e) => onPeerDisconnected(occupancy, e.role)),
    Match.tag('expired', () => onExpired(occupancy)),
    Match.exhaustive,
  );

/**
 * Handles the initiator connecting.
 * @param state Current room state.
 * @returns The next step.
 */
const onInitiatorConnected = (state: RoomState): Step =>
  Match.value(state.phase).pipe(
    Match.when('waiting', () => advance(state)),
    Match.whenOr('pake', 'responder-pake', () => advance(state, [PEER_JOINED])),
    Match.whenOr('initiator-pake', 'relay', () => kill()),
    Match.exhaustive,
  );

/**
 * Handles an inbound message from one party.
 * @param state Current room state.
 * @param occupancy Roles currently connected.
 * @param role Role that sent the message.
 * @param message The inbound message.
 * @param sid Session id echoed to the responder on join.
 * @returns The next step.
 */
const onMessage = (
  state: RoomState,
  occupancy: Occupancy,
  role: Role,
  message: InboundMessage,
  sid: Sid,
): Step =>
  Match.value([state.phase, role, occupancy[role], message] as const).pipe(
    Match.when(['waiting', 'responder', true, { type: 'join', protocol: PROTOCOL_VERSION }], () =>
      onJoin(occupancy, sid),
    ),
    Match.when(['waiting', 'responder', true, { type: 'join' }], () =>
      kill([error('responder', 'protocol-mismatch')]),
    ),
    Match.when(['pake', 'initiator', true, { type: 'pake' }], ([, , , m]) =>
      advance({ phase: 'initiator-pake' }, [{ to: 'responder', message: m }]),
    ),
    Match.when(['pake', 'responder', true, { type: 'pake' }], ([, , , m]) =>
      advance({ phase: 'responder-pake' }, [{ to: 'initiator', message: m }]),
    ),
    Match.when(['initiator-pake', 'responder', true, { type: 'pake' }], ([, , , m]) =>
      advance({ phase: 'relay' }, [{ to: 'initiator', message: m }]),
    ),
    Match.when(['responder-pake', 'initiator', true, { type: 'pake' }], ([, , , m]) =>
      advance({ phase: 'relay' }, [{ to: 'responder', message: m }]),
    ),
    Match.when(['relay', 'initiator', true, { type: 'sealed' }], ([, , , m]) =>
      advance(state, [{ to: 'responder', message: m }]),
    ),
    Match.when(['relay', 'responder', true, { type: 'sealed' }], ([, , , m]) =>
      advance(state, [{ to: 'initiator', message: m }]),
    ),
    Match.orElse(() => kill()),
  );

/**
 * Handles a valid join from the responder.
 * @param occupancy Roles currently connected.
 * @param sid Session id handed to the responder.
 * @returns The next step.
 */
const onJoin = (occupancy: Occupancy, sid: Sid): Step =>
  advance({ phase: 'pake' }, [
    { to: 'responder', message: { type: 'joined', sid } },
    ...(occupancy.initiator ? [PEER_JOINED] : []),
  ]);

/**
 * Handles a peer dropping its connection.
 * @param occupancy Roles currently connected.
 * @param role Role that disconnected.
 * @returns The next step.
 */
const onPeerDisconnected = (occupancy: Occupancy, role: Role): Step => {
  const survivor = opposite(role);
  return kill(occupancy[survivor] ? [error(survivor, 'peer-failed')] : []);
};

/**
 * Handles the room's lifetime running out.
 * @param occupancy Roles currently connected.
 * @returns The next step.
 */
const onExpired = (occupancy: Occupancy): Step =>
  kill(ROLES.filter((role) => occupancy[role]).map((role) => error(role, 'room-expired')));
