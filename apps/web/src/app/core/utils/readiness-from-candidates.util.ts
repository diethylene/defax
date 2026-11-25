import type { Readiness } from '@web/store/connectivity/connectivity-status.type';
import * as EffectArray from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

/** Readiness each gathered candidate type implies, most capable first. */
const readinessByCandidateType = {
  /** A server-reflexive candidate means the network lets the device be reached directly. */
  srflx: { _tag: 'DirectPossible' },
  /** A relay candidate means the connection needs TURN to reach the peer. */
  relay: { _tag: 'RelayRequired' },
} as const satisfies Record<string, Readiness>;

/** Candidate types in the order that decides readiness. */
const preference = ['srflx', 'relay'] as const;

/**
 * Classifies the candidate types gathered by the self-check probe.
 * @param candidateTypes ICE candidate kinds such as `host`, `srflx`, or `relay`.
 * @returns `DirectPossible` when a srflx candidate exists, else `RelayRequired` when relay exists, else `Offline`.
 */
export const readinessFromCandidates = (candidateTypes: readonly string[]): Readiness =>
  pipe(
    preference,
    EffectArray.findFirst((type) => candidateTypes.includes(type)),
    Option.map((type) => readinessByCandidateType[type]),
    Option.getOrElse((): Readiness => ({ _tag: 'Offline' })),
  );
