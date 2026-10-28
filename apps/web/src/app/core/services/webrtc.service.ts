import { Injectable, inject } from '@angular/core';
import type { SealedKind } from '@contract/signal/sealed-kind.model';
import {
  catchError,
  defer,
  EMPTY,
  finalize,
  from,
  Observable,
  ReplaySubject,
  switchMap,
  tap,
  timeout,
} from 'rxjs';
import {
  DATA_CHANNEL_BUFFER_LOW,
  DATA_CHANNEL_LABEL,
  RTC_CONFIGURATION,
} from '../../shared/constants/transfer-protocol';
import {
  parseRtcAnswer,
  parseRtcIce,
  parseRtcOffer,
} from '../../shared/utilities/transfer-message';
import { SignalingService } from './signaling.service';

/** Open data channel handed to the transfer once the peer connection is up. */
export interface RtcChannel {
  /** Sends one buffer, completing once the channel has taken it. */
  send(data: ArrayBuffer): Observable<void>;
  /** Buffers received from the peer. */
  readonly messages$: Observable<ArrayBuffer>;
  /** Completes once the send buffer is empty. */
  drain(): Observable<void>;
  /** Closes the channel and its peer connection. */
  close(): void;
}

/** Holds ICE candidates until the peer has a remote description. */
interface IceHandle {
  /** Adds every held candidate to the peer. */
  flush: () => void;
  /** Stops listening for candidates. */
  dispose: () => void;
}

/** Time a peer connection has to open before the negotiation fails. */
const CONNECT_TIMEOUT_MS = 30_000;

/** Opens the data channels the transfer runs over. */
@Injectable({ providedIn: 'root' })
export class WebRtcService {
  /** Signaling channel carrying SDP and ICE between the peers. */
  private readonly signaling = inject(SignalingService);

  /**
   * Opens the sender's data channel.
   * @returns Observable emitting the open channel.
   */
  openInitiator(): Observable<RtcChannel> {
    return defer(() => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
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
    }).pipe(timeout(CONNECT_TIMEOUT_MS));
  }

  /**
   * Opens the receiver's data channel.
   * @returns Observable emitting the channel the sender opened.
   */
  openResponder(): Observable<RtcChannel> {
    return defer(() => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
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
    }).pipe(timeout(CONNECT_TIMEOUT_MS));
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
      switchMap(() => this.signaling.receiveSealed('rtc-answer', parseRtcAnswer)),
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
    return this.signaling.receiveSealed('rtc-offer', parseRtcOffer).pipe(
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
      .sealed$('rtc-ice', parseRtcIce)
      .subscribe(({ candidate, sdpMid, sdpMLineIndex }) => {
        if (candidate === null) return;
        const init: RTCIceCandidateInit = { candidate, sdpMid, sdpMLineIndex };
        if (peer.remoteDescription) {
          void peer.addIceCandidate(init).catch(() => undefined);
        } else {
          pending.push(init);
        }
      });
    return {
      flush: () => {
        for (const init of pending.splice(0)) {
          void peer.addIceCandidate(init).catch(() => undefined);
        }
      },
      dispose: () => sub.unsubscribe(),
    };
  }

  /**
   * Wraps a data channel as an RtcChannel once it opens.
   * @param channel Channel created by either peer.
   * @param peer Peer connection owning the channel.
   * @returns Observable emitting the open channel.
   */
  private openChannel(channel: RTCDataChannel, peer: RTCPeerConnection): Observable<RtcChannel> {
    return new Observable<RtcChannel>((subscriber) => {
      const messages = new ReplaySubject<ArrayBuffer>();
      channel.binaryType = 'arraybuffer';
      channel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_LOW;

      const handle: RtcChannel = {
        send: (data) => this.sendData(channel, data),
        messages$: messages.asObservable(),
        drain: () => this.drain(channel),
        close: () => {
          channel.close();
          peer.close();
        },
      };

      const open = (): void => {
        subscriber.next(handle);
        subscriber.complete();
      };

      channel.onmessage = (event) => messages.next(event.data as ArrayBuffer);
      channel.onerror = () => subscriber.error(new Error('data channel error'));
      channel.onclose = () => {
        messages.complete();
        subscriber.error(new Error('data channel closed'));
      };
      channel.onopen = open;

      // The channel can already be open by the time this observable is
      // subscribed, in which case onopen has already fired and never will.
      if (channel.readyState === 'open') {
        open();
      }
    });
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
      if (channel.bufferedAmount <= DATA_CHANNEL_BUFFER_LOW) {
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
        channel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_LOW;
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
