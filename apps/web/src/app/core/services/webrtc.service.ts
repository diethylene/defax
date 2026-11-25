import { Injectable, inject } from '@angular/core';
import { RtcAnswer, RtcIce, RtcOffer } from '@contract/signal/payload.model';
import type { SealedKind } from '@contract/signal/sealed-kind.model';
import type { IceServer } from '@contract/turn/ice-servers.model';
import * as Result from 'effect/Result';
import {
  catchError,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  from,
  fromEvent,
  map,
  merge,
  Observable,
  of,
  ReplaySubject,
  shareReplay,
  switchMap,
  take,
  tap,
  timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { DATA_CHANNEL_LABEL } from '../../shared/constants/transfer-protocol';
import { decodeJson } from '../../shared/utils/decode-json.util';
import { TurnCredentialApiService } from '../api/turn-credential-api.service';
import type { IceHandle, RtcChannel } from '../interfaces/rtc-channel.interface';
import type { TransferRoute } from '../interfaces/transfer.interface';
import { routeFromStats } from '../utils/route-from-stats.util';
import { SignalingService } from './signaling.service';

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

/** Opens the data channels the transfer runs over. */
@Injectable({ providedIn: 'root' })
export class WebRtcService {
  /** Signaling channel carrying SDP and ICE between the peers. */
  private readonly signaling = inject(SignalingService);
  /** Client minting the ICE servers the peer connection gathers candidates from. */
  private readonly turnCredentials = inject(TurnCredentialApiService);

  /**
   * Opens the sender's data channel.
   * @returns Observable emitting the open channel.
   */
  openInitiator(): Observable<RtcChannel> {
    return this.iceServers().pipe(
      switchMap((iceServers) =>
        defer(() => {
          const peer = new RTCPeerConnection({ iceServers });
          const channel = peer.createDataChannel(DATA_CHANNEL_LABEL, {
            ordered: true,
          });
          const ice = this.attachIce(peer);
          return this.negotiateInitiator(peer, channel, ice).pipe(
            finalize(() => {
              ice.dispose();
              if (channel.readyState !== 'open') peer.close();
            }),
          );
        }).pipe(timeout(environment.timeouts.connect)),
      ),
    );
  }

  /**
   * Opens the receiver's data channel.
   * @returns Observable emitting the channel the sender opened.
   */
  openResponder(): Observable<RtcChannel> {
    return this.iceServers().pipe(
      switchMap((iceServers) =>
        defer(() => {
          const peer = new RTCPeerConnection({ iceServers });
          const ice = this.attachIce(peer);
          const incoming = new ReplaySubject<RTCDataChannel>(1);
          peer.ondatachannel = (event) => {
            incoming.next(event.channel);
            incoming.complete();
          };
          // The teardown cannot see the channel, so the peer's own state marks
          // the handover of the peer to the caller.
          return this.negotiateResponder(peer, incoming, ice).pipe(
            finalize(() => {
              ice.dispose();
              if (peer.connectionState !== 'connected') peer.close();
            }),
          );
        }).pipe(timeout(environment.timeouts.connect)),
      ),
    );
  }

  /**
   * Fetches the ICE servers for a peer connection, falling back to STUN only.
   * @returns ICE servers for RTCPeerConnection.
   */
  private iceServers(): Observable<RTCIceServer[]> {
    return this.turnCredentials.getIceServers(environment.apiBaseUrl).pipe(
      map((result) =>
        Result.match(result, {
          onSuccess: (response) => response.iceServers.map(toRtcIceServer),
          onFailure: () => environment.rtc.stunUrls.map((url) => ({ urls: [url] })),
        }),
      ),
    );
  }

  /**
   * Runs the offer side of the negotiation.
   * @param peer Peer connection to negotiate on.
   * @param channel Data channel created before the offer.
   * @param ice Handle holding the peer's ICE candidates.
   * @returns Observable emitting the open channel.
   */
  private negotiateInitiator(
    peer: RTCPeerConnection,
    channel: RTCDataChannel,
    ice: IceHandle,
  ): Observable<RtcChannel> {
    return from(peer.createOffer()).pipe(
      switchMap((offer) => from(peer.setLocalDescription(offer))),
      tap(() => this.sendSignal('rtc-offer', { sdp: peer.localDescription?.sdp ?? '' })),
      switchMap(() =>
        this.signaling.receiveSealed('rtc-answer', (json) => decodeJson(RtcAnswer, json)),
      ),
      switchMap((answer) => from(peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp }))),
      tap(() => ice.flush()),
      switchMap(() => this.openChannel(channel, peer)),
    );
  }

  /**
   * Runs the answer side of the negotiation.
   * @param peer Peer connection to negotiate on.
   * @param incoming Channel the sender opens on this peer.
   * @param ice Handle holding the peer's ICE candidates.
   * @returns Observable emitting the open channel.
   */
  private negotiateResponder(
    peer: RTCPeerConnection,
    incoming: Observable<RTCDataChannel>,
    ice: IceHandle,
  ): Observable<RtcChannel> {
    return this.signaling
      .receiveSealed('rtc-offer', (json) => decodeJson(RtcOffer, json))
      .pipe(
        switchMap((offer) => from(peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp }))),
        tap(() => ice.flush()),
        switchMap(() => from(peer.createAnswer())),
        switchMap((answer) => from(peer.setLocalDescription(answer))),
        tap(() => this.sendSignal('rtc-answer', { sdp: peer.localDescription?.sdp ?? '' })),
        switchMap(() => incoming),
        switchMap((channel) => this.openChannel(channel, peer)),
      );
  }

  /**
   * Bridges the peer's ICE candidates over signaling.
   * @param peer Peer connection the candidates belong to.
   * @returns Handle that flushes or disposes the held candidates.
   */
  private attachIce(peer: RTCPeerConnection): IceHandle {
    const pending: RTCIceCandidateInit[] = [];
    peer.onicecandidate = (event) => {
      this.sendSignal('rtc-ice', {
        candidate: event.candidate?.candidate ?? null,
        sdpMid: event.candidate?.sdpMid ?? null,
        sdpMLineIndex: event.candidate?.sdpMLineIndex ?? null,
      });
    };
    const sub = this.signaling
      .sealed$('rtc-ice', (json) => decodeJson(RtcIce, json))
      .subscribe(({ candidate, sdpMid, sdpMLineIndex }) => {
        if (candidate === null) return;
        const init: RTCIceCandidateInit = { candidate, sdpMid, sdpMLineIndex };
        if (peer.remoteDescription) {
          this.addIceCandidate(peer, init);
        } else {
          pending.push(init);
        }
      });
    return {
      flush: () => {
        for (const init of pending.splice(0)) {
          this.addIceCandidate(peer, init);
        }
      },
      dispose: () => sub.unsubscribe(),
    };
  }

  /**
   * Adds one ICE candidate to the peer, dropping failures.
   * @param peer Peer connection the candidate belongs to.
   * @param init Candidate received from signaling.
   */
  private addIceCandidate(peer: RTCPeerConnection, init: RTCIceCandidateInit): void {
    from(peer.addIceCandidate(init))
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  /**
   * Builds the live route stream for a peer connection, reading the settled ICE
   * pair once connected and again whenever the connection state changes.
   * @param peer Peer connection whose stats decide the route.
   * @returns Hot route stream emitting the current route and re-emitting on change.
   */
  private routeStream(peer: RTCPeerConnection): Observable<TransferRoute> {
    const read = (): Observable<TransferRoute> =>
      from(peer.getStats()).pipe(
        map((report) => routeFromStats(Array.from(report.values()))),
        catchError(() => EMPTY),
      );
    const connected$: Observable<unknown> =
      peer.connectionState === 'connected'
        ? of(undefined)
        : fromEvent(peer, 'connectionstatechange').pipe(
            filter(() => peer.connectionState === 'connected'),
            take(1),
          );
    return merge(
      connected$.pipe(switchMap(() => read())),
      fromEvent(peer, 'connectionstatechange').pipe(switchMap(() => read())),
      fromEvent(peer, 'iceconnectionstatechange').pipe(switchMap(() => read())),
    ).pipe(distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: false }));
  }

  /**
   * Wraps a data channel as an RtcChannel once it opens.
   * @param channel Channel created by either peer.
   * @param peer Peer connection owning the channel.
   * @returns Observable emitting the open channel.
   */
  private openChannel(channel: RTCDataChannel, peer: RTCPeerConnection): Observable<RtcChannel> {
    const messages = new ReplaySubject<ArrayBuffer>();
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = environment.transfer.bufferLow;

    return new Observable<RTCDataChannel>((subscriber) => {
      channel.onmessage = (event) => messages.next(event.data as ArrayBuffer);
      channel.onerror = () => subscriber.error(new Error('data channel error'));
      channel.onclose = () => {
        messages.complete();
        subscriber.error(new Error('data channel closed'));
      };
      // The channel can already be open by the time this observable is
      // subscribed, in which case onopen has already fired and never will.
      if (channel.readyState === 'open') {
        subscriber.next(channel);
        return;
      }
      channel.onopen = () => subscriber.next(channel);
    }).pipe(
      take(1),
      map(() => this.channelHandle(channel, peer, messages.asObservable(), this.routeStream(peer))),
    );
  }

  /**
   * Builds the transfer-facing handle for an open channel.
   * @param channel Open data channel.
   * @param peer Peer connection owning the channel.
   * @param messages Buffers received from the peer.
   * @param route$ Live path the bytes travel.
   * @returns The channel handle.
   */
  private channelHandle(
    channel: RTCDataChannel,
    peer: RTCPeerConnection,
    messages: Observable<ArrayBuffer>,
    route$: Observable<TransferRoute>,
  ): RtcChannel {
    return {
      send: (data) => this.sendData(channel, data),
      messages$: messages,
      drain: () => this.drain(channel),
      close: () => {
        channel.close();
        peer.close();
      },
      route$,
    };
  }

  /**
   * Sends one buffer and completes once the channel has taken it.
   * @param channel Open data channel.
   * @param data Bytes to send.
   * @returns Observable completing when the send buffer stays low.
   */
  private sendData(channel: RTCDataChannel, data: ArrayBuffer): Observable<void> {
    return new Observable<void>((subscriber) => {
      if (channel.readyState !== 'open') {
        subscriber.error(new Error('data channel not open'));
        return;
      }
      const onLow = (): void => {
        cleanup();
        subscriber.next();
        subscriber.complete();
      };
      const onClose = (): void => {
        cleanup();
        subscriber.error(new Error('data channel closed'));
      };
      const cleanup = (): void => {
        channel.removeEventListener('bufferedamountlow', onLow);
        channel.removeEventListener('close', onClose);
      };
      channel.send(data);
      if (channel.bufferedAmount <= environment.transfer.bufferLow) {
        subscriber.next();
        subscriber.complete();
        return;
      }
      channel.addEventListener('bufferedamountlow', onLow);
      channel.addEventListener('close', onClose);
      return cleanup;
    });
  }

  /**
   * Waits until the channel's send buffer is empty.
   * @param channel Open data channel.
   * @returns Observable completing when the buffer reaches zero.
   */
  private drain(channel: RTCDataChannel): Observable<void> {
    return new Observable<void>((subscriber) => {
      if (channel.readyState !== 'open') {
        subscriber.error(new Error('data channel not open'));
        return;
      }
      if (channel.bufferedAmount === 0) {
        subscriber.next();
        subscriber.complete();
        return;
      }
      channel.bufferedAmountLowThreshold = 0;
      const onLow = (): void => {
        channel.bufferedAmountLowThreshold = environment.transfer.bufferLow;
        cleanup();
        subscriber.next();
        subscriber.complete();
      };
      const onClose = (): void => {
        cleanup();
        subscriber.error(new Error('data channel closed'));
      };
      const cleanup = (): void => {
        channel.removeEventListener('bufferedamountlow', onLow);
        channel.removeEventListener('close', onClose);
      };
      channel.addEventListener('bufferedamountlow', onLow);
      channel.addEventListener('close', onClose);
      return cleanup;
    });
  }

  /**
   * Sends one sealed signaling message, dropping failures.
   * @param kind Sealed message kind.
   * @param payload Message payload.
   */
  private sendSignal(kind: SealedKind, payload: unknown): void {
    this.signaling
      .sendSealed(kind, payload)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}
