import { pipe } from 'effect/Function';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import type { TransferRoute } from '../interfaces/transfer.interface';

/** One stat entry, reduced to the fields that decide the route. */
const IceStatEntry = Schema.Struct({
  /** Stats entry identifier. */
  id: Schema.String,
  /** Stats entry kind, such as `candidate-pair` or `local-candidate`. */
  type: Schema.String,
  /** Whether this pair carried the selected traffic. */
  selected: Schema.optional(Schema.Boolean),
  /** Whether this pair was nominated by the controlling agent. */
  nominated: Schema.optional(Schema.Boolean),
  /** Local candidate a pair refers to. */
  localCandidateId: Schema.optional(Schema.String),
  /** Remote candidate a pair refers to. */
  remoteCandidateId: Schema.optional(Schema.String),
  /** ICE candidate kind, such as `host`, `srflx`, or `relay`. */
  candidateType: Schema.optional(Schema.String),
});

/** The stat fields the route decision reads. */
type IceStatEntry = typeof IceStatEntry.Type;

/** Decoder for a whole stats snapshot. */
const IceStats = Schema.Array(IceStatEntry);

/** Whether an entry is a candidate pair. */
const isPair = (entry: IceStatEntry): boolean => entry.type === 'candidate-pair';

/** Whether a pair was selected or nominated as the one in use. */
const isChosen = (entry: IceStatEntry): boolean =>
  entry.selected === true || entry.nominated === true;

/**
 * Picks the candidate pair carrying the connection's traffic.
 * @param entries Parsed stats entries.
 * @returns The selected pair, else the nominated pair, else undefined.
 */
const chosenPair = (entries: readonly IceStatEntry[]): IceStatEntry | undefined => {
  const pairs = entries.filter(isPair);
  return pairs.find((pair) => pair.selected === true) ?? pairs.find(isChosen);
};

/**
 * Reads each candidate's type by its stats id.
 * @param entries Parsed stats entries.
 * @returns Candidate type by candidate id.
 */
const candidateTypes = (
  entries: readonly IceStatEntry[],
): ReadonlyMap<string, string | undefined> =>
  new Map(
    entries
      .filter((entry) => entry.type === 'local-candidate' || entry.type === 'remote-candidate')
      .map((entry) => [entry.id, entry.candidateType] as const),
  );

/**
 * Whether either end of a pair is a TURN relay candidate.
 * @param types Candidate type by candidate id.
 * @param pair Pair to inspect.
 * @returns True when the local or remote candidate is relayed.
 */
const isRelayed = (types: ReadonlyMap<string, string | undefined>, pair: IceStatEntry): boolean =>
  [pair.localCandidateId, pair.remoteCandidateId].some(
    (id) => id !== undefined && types.get(id) === 'relay',
  );

/**
 * Reads the route of one chosen pair.
 * @param types Candidate type by candidate id.
 * @param pair Pair to inspect.
 * @returns `relay` when either end is relayed, else `direct`.
 */
const routeOfPair = (
  types: ReadonlyMap<string, string | undefined>,
  pair: IceStatEntry,
): TransferRoute => (isRelayed(types, pair) ? 'relay' : 'direct');

/**
 * Decides whether a stats snapshot used a TURN relay.
 * @param entries Parsed stats entries.
 * @returns The route the connection took.
 */
const routeOf = (entries: readonly IceStatEntry[]): TransferRoute => {
  const pair = chosenPair(entries);
  return pair === undefined ? 'direct' : routeOfPair(candidateTypes(entries), pair);
};

/**
 * Reads the negotiated route from a WebRTC stats snapshot.
 * @param stats Raw stat entries from `RTCPeerConnection.getStats`.
 * @returns `relay` when the chosen pair uses a relay candidate, else `direct`.
 */
export const routeFromStats = (stats: readonly unknown[]): TransferRoute =>
  pipe(
    Schema.decodeUnknownResult(IceStats)(stats),
    Result.match({ onSuccess: routeOf, onFailure: () => 'direct' }),
  );
