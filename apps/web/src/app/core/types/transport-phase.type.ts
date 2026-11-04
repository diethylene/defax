import type { Sid } from '@contract/signal/sid.model';
import type { SignalMessage } from '../../shared/utils/signal-message.util';

/** Transport phase with no room open. */
export interface IdlePhase {
  /** Discriminant. */
  readonly _tag: 'idle';
}

/** Host waiting for a guest to join. */
export interface HostWaitingPhase {
  /** Discriminant. */
  readonly _tag: 'host-waiting';
  /** Session id the host will hand to the guest. */
  readonly sid: Sid;
  /** Messages held until the guest joins. */
  readonly outgoing: readonly SignalMessage[];
}

/** Host with a guest connected. */
export interface HostJoinedPhase {
  /** Discriminant. */
  readonly _tag: 'host-joined';
  /** Session id handed to the guest. */
  readonly sid: Sid;
}

/** Callbacks awaiting a join answer. */
export interface PendingJoin {
  /** Resolves with the host session id. */
  readonly resolve: (sid: Sid) => void;
  /** Rejects with the join failure. */
  readonly reject: (error: Error) => void;
}

/** Guest waiting for the host to answer its join request. */
export interface GuestConnectingPhase {
  /** Discriminant. */
  readonly _tag: 'guest-connecting';
  /** Callbacks for the pending join. */
  readonly pending: PendingJoin;
}

/** Guest whose join attempt has settled. */
export interface GuestSettledPhase {
  /** Discriminant. */
  readonly _tag: 'guest-settled';
}

/** Host phases that answer join requests. */
export type HostPhase = HostWaitingPhase | HostJoinedPhase;

/** Lifecycle phase of the transport. */
export type Phase =
  | IdlePhase
  | HostWaitingPhase
  | HostJoinedPhase
  | GuestConnectingPhase
  | GuestSettledPhase;
