import { TestBed } from '@angular/core/testing';
import type { IceServersResponse } from '@contract/turn/ice-servers.model';
import type { Readiness } from '@web/store/connectivity/connectivity-status.type';
import * as Result from 'effect/Result';
import { firstValueFrom, type Observable, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnCredentialApiService } from '../api/turn-credential-api.service';
import {
  type TurnCredentialApiError,
  TurnCredentialRequestFailed,
} from '../api/turn-credential-api-errors.model';
import { ConnectivityProbeService } from './connectivity-probe.service';

/** ICE servers the credential client mints for the probe. */
const iceServers: IceServersResponse = {
  iceServers: [
    { urls: ['stun:stun.example.org:3478'] },
    { urls: ['turn:turn.example.org:3478'], username: 'user', credential: 'secret' },
  ],
};

/** The minted servers in the shape RTCPeerConnection expects. */
const rtcIceServers = [
  { urls: ['stun:stun.example.org:3478'] },
  { urls: ['turn:turn.example.org:3478'], username: 'user', credential: 'secret' },
];

/** A stats snapshot holding one local candidate of each given type. */
const gathered = (candidateTypes: readonly string[]): ReadonlyMap<string, unknown> =>
  new Map(
    candidateTypes.map((candidateType, index) => [
      `candidate-${index}`,
      { id: `candidate-${index}`, type: 'local-candidate', candidateType },
    ]),
  );

/** Builds a fake RTCPeerConnection class whose stats come from the given reader. */
const fakePeer = (readStats: () => Promise<ReadonlyMap<string, unknown>>) => {
  const constructed = vi.fn();
  const closed = vi.fn();
  const channelClosed = vi.fn();

  class FakePeerConnection {
    readonly iceGatheringState = 'complete';

    constructor(options: { readonly iceServers?: readonly RTCIceServer[] }) {
      constructed(options.iceServers);
    }

    createDataChannel(): { readonly close: () => void } {
      return { close: channelClosed };
    }

    createOffer(): Promise<{ readonly type: 'offer'; readonly sdp: string }> {
      return Promise.resolve({ type: 'offer', sdp: 'v=0' });
    }

    setLocalDescription(): Promise<void> {
      return Promise.resolve();
    }

    getStats(): Promise<ReadonlyMap<string, unknown>> {
      return readStats();
    }

    addEventListener(): void {}

    removeEventListener(): void {}

    close(): void {
      closed();
    }
  }

  return { FakePeerConnection, constructed, closed, channelClosed };
};

/** Registers the probe with a fake credential client and starts a check. */
const probe = (
  result: Result.Result<IceServersResponse, TurnCredentialApiError>,
): Observable<Readiness> => {
  TestBed.configureTestingModule({
    providers: [
      ConnectivityProbeService,
      {
        provide: TurnCredentialApiService,
        useValue: { getIceServers: (): Observable<typeof result> => of(result) },
      },
    ],
  });
  return TestBed.inject(ConnectivityProbeService).check();
};

/** Registers a fake peer connection for the probe to construct. */
const stubPeer = (peer: ReturnType<typeof fakePeer>): void => {
  vi.stubGlobal('RTCPeerConnection', peer.FakePeerConnection);
};

describe('ConnectivityProbeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('success', () => {
    it('reports DirectPossible when a srflx candidate is gathered', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host', 'srflx'])));
      stubPeer(peer);

      const readiness = await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(readiness).toEqual({ _tag: 'DirectPossible' });
    });

    it('reports RelayRequired when only a relay candidate is gathered', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host', 'relay'])));
      stubPeer(peer);

      const readiness = await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(readiness).toEqual({ _tag: 'RelayRequired' });
    });

    it('reports Offline when only host candidates are gathered', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host'])));
      stubPeer(peer);

      const readiness = await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(readiness).toEqual({ _tag: 'Offline' });
    });

    it('mints the servers into the browser shape for the peer connection', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host'])));
      stubPeer(peer);

      await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(peer.constructed).toHaveBeenCalledWith(rtcIceServers);
    });

    it('closes the throwaway channel and peer connection after reading candidates', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host', 'srflx'])));
      stubPeer(peer);

      await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(peer.channelClosed).toHaveBeenCalledOnce();
      expect(peer.closed).toHaveBeenCalledOnce();
    });
  });

  describe('invariants', () => {
    it('reports Offline without opening a peer connection when minting fails', async () => {
      const peer = fakePeer(() => Promise.resolve(gathered(['host', 'srflx'])));
      stubPeer(peer);

      const readiness = await firstValueFrom(
        probe(Result.fail(new TurnCredentialRequestFailed({ cause: 'offline' }))),
      );

      expect(readiness).toEqual({ _tag: 'Offline' });
      expect(peer.constructed).not.toHaveBeenCalled();
    });

    it('reports Offline and still closes the peer when stats cannot be read', async () => {
      const peer = fakePeer(() => Promise.reject(new Error('stats unavailable')));
      stubPeer(peer);

      const readiness = await firstValueFrom(probe(Result.succeed(iceServers)));

      expect(readiness).toEqual({ _tag: 'Offline' });
      expect(peer.closed).toHaveBeenCalledOnce();
      expect(peer.channelClosed).toHaveBeenCalledOnce();
    });

    it('never errors, so a subscriber always receives a readiness', async () => {
      const peer = fakePeer(() => Promise.reject(new Error('stats unavailable')));
      stubPeer(peer);

      await expect(firstValueFrom(probe(Result.succeed(iceServers)))).resolves.toEqual({
        _tag: 'Offline',
      });
    });
  });
});
