import { Injectable, inject } from '@angular/core';
import type { IceServer } from '@contract/turn/ice-servers.model';
import type { Readiness } from '@web/store/connectivity/connectivity-status.type';
import * as EffectArray from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { catchError, defer, finalize, from, map, Observable, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TurnCredentialApiService } from '../api/turn-credential-api.service';
import { readinessFromCandidates } from '../utils/readiness-from-candidates.util';

/** Label for the throwaway channel that gives the probe's ICE a media section. */
const PROBE_CHANNEL_LABEL = 'connectivity-probe';

/** Milliseconds the probe waits for ICE gathering before reading what it has. */
const GATHER_TIMEOUT_MS = 5_000;

/** The stat fields the probe reads from a gathered candidate. */
const LocalCandidateStat = Schema.Struct({
  /** Stats entry kind, such as `local-candidate`. */
  type: Schema.String,
  /** ICE candidate kind, such as `host`, `srflx`, or `relay`. */
  candidateType: Schema.optional(Schema.String),
});

/**
 * Converts a contract ICE server to the browser's shape, dropping absent credentials.
 * @param server Decoded STUN or TURN server entry.
 * @returns The server as RTCPeerConnection expects it.
 */
const toRtcIceServer = (server: IceServer): RTCIceServer => ({
  urls: [...server.urls],
  ...(server.username === undefined ? {} : { username: server.username }),
  ...(server.credential === undefined ? {} : { credential: server.credential }),
});

/**
 * Reads one stat entry as a local candidate type.
 * @param stat Raw stat entry from `getStats`.
 * @returns The candidate type, or none when the entry is not a local candidate.
 */
const localCandidateType = (stat: unknown): Option.Option<string> =>
  pipe(
    Schema.decodeUnknownOption(LocalCandidateStat)(stat),
    Option.filter((entry) => entry.type === 'local-candidate'),
    Option.flatMap((entry) => Option.fromUndefinedOr(entry.candidateType)),
  );

/**
 * Collects the candidate types gathered by a peer connection.
 * @param report Stats snapshot from `getStats`.
 * @returns Every local candidate type in the snapshot.
 */
const candidateTypesOf = (report: ReadonlyMap<string, unknown>): readonly string[] =>
  pipe(
    report.values(),
    EffectArray.fromIterable,
    EffectArray.map(localCandidateType),
    EffectArray.getSomes,
  );

/**
 * Waits until ICE gathering finishes.
 * @param peer Peer connection gathering candidates.
 * @returns Observable emitting once gathering is complete.
 */
const gatheringComplete = (peer: RTCPeerConnection): Observable<void> =>
  new Observable<void>((subscriber) => {
    const onStateChange = (): void => {
      if (peer.iceGatheringState !== 'complete') return;
      subscriber.next();
      subscriber.complete();
    };
    peer.addEventListener('icegatheringstatechange', onStateChange);
    onStateChange();
    return () => peer.removeEventListener('icegatheringstatechange', onStateChange);
  });

/** Probes the device's network to classify its connection readiness. */
@Injectable({ providedIn: 'root' })
export class ConnectivityProbeService {
  /** Client minting the ICE servers the probe gathers candidates from. */
  private readonly turnCredentials = inject(TurnCredentialApiService);

  /**
   * Probes the device's network and reports its readiness.
   * @returns The readiness; never errors, `Offline` is a valid result.
   */
  check(): Observable<Readiness> {
    return this.turnCredentials.getIceServers(environment.apiBaseUrl).pipe(
      switchMap((result) =>
        Result.match(result, {
          onSuccess: ({ iceServers }) => this.gather(iceServers.map(toRtcIceServer)),
          onFailure: () => of<Readiness>({ _tag: 'Offline' }),
        }),
      ),
      // The probe's contract is that it never errors; a failed gather is an
      // absent observation, and absent candidates classify as Offline.
      catchError(() => of<Readiness>({ _tag: 'Offline' })),
    );
  }

  /**
   * Gathers ICE candidates on a throwaway peer connection and classifies them.
   * @param iceServers Minted ICE servers for the probe connection.
   * @returns The readiness implied by the gathered candidates.
   */
  private gather(iceServers: readonly RTCIceServer[]): Observable<Readiness> {
    return defer(() => {
      const peer = new RTCPeerConnection({ iceServers: [...iceServers] });
      const channel = peer.createDataChannel(PROBE_CHANNEL_LABEL);
      return this.startGathering(peer).pipe(
        switchMap(() => from(peer.getStats())),
        map(candidateTypesOf),
        map(readinessFromCandidates),
        finalize(() => {
          channel.close();
          peer.close();
        }),
      );
    });
  }

  /**
   * Starts ICE gathering and waits for it to finish or time out.
   * @param peer Peer connection gathering candidates.
   * @returns Observable emitting once gathering settles.
   */
  private startGathering(peer: RTCPeerConnection): Observable<void> {
    return defer(() =>
      from(peer.createOffer()).pipe(
        switchMap((offer) => from(peer.setLocalDescription(offer))),
        switchMap(() => gatheringComplete(peer)),
        timeout({ each: GATHER_TIMEOUT_MS, with: () => of(undefined) }),
      ),
    );
  }
}
