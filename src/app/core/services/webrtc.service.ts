import { Injectable, inject } from '@angular/core';
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
  timeout
} from 'rxjs';
import type { SealedKind } from '../../shared/constants/signal-message';
import {
  DATA_CHANNEL_BUFFER_LOW,
  DATA_CHANNEL_LABEL,
  RTC_CONFIGURATION
} from '../../shared/constants/transfer-protocol';
import {
  parseRtcAnswer,
  parseRtcIce,
  parseRtcOffer
} from '../../shared/validators/transfer-message';
import { SignalingService } from './signaling.service';

export interface RtcChannel {
  send(data: ArrayBuffer): Observable<void>;
  readonly messages$: Observable<ArrayBuffer>;
  close(): void;
}

interface IceHandle {
  flush: () => void;
  dispose: () => void;
}

const CONNECT_TIMEOUT_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class WebRtcService {
  private readonly signaling = inject(SignalingService);

  openInitiator(): Observable<RtcChannel> {
    return defer(() => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
      const channel = peer.createDataChannel(DATA_CHANNEL_LABEL, {
        ordered: true
      });
      const ice = this.attachIce(peer);
      let opened = false;
      return this.negotiateInitiator(peer, channel, ice).pipe(
        tap(() => {
          opened = true;
        }),
        finalize(() => {
          ice.dispose();
          if (!opened) peer.close();
        })
      );
    }).pipe(timeout(CONNECT_TIMEOUT_MS));
  }

  openResponder(): Observable<RtcChannel> {
    return defer(() => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
      const ice = this.attachIce(peer);
      const incoming = new ReplaySubject<RTCDataChannel>(1);
      peer.ondatachannel = (event) => {
        incoming.next(event.channel);
        incoming.complete();
      };
      let opened = false;
      return this.negotiateResponder(peer, incoming, ice).pipe(
        tap(() => {
          opened = true;
        }),
        finalize(() => {
          ice.dispose();
          if (!opened) peer.close();
        })
      );
    }).pipe(timeout(CONNECT_TIMEOUT_MS));
  }

  private negotiateInitiator(
    peer: RTCPeerConnection,
    channel: RTCDataChannel,
    ice: IceHandle
  ): Observable<RtcChannel> {
    return from(peer.createOffer()).pipe(
      switchMap((offer) => from(peer.setLocalDescription(offer))),
      tap(() =>
        this.sendSignal('rtc-offer', { sdp: peer.localDescription?.sdp ?? '' })
      ),
      switchMap(() =>
        this.signaling.receiveSealed('rtc-answer', parseRtcAnswer)
      ),
      switchMap((answer) =>
        from(peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp }))
      ),
      tap(() => ice.flush()),
      switchMap(() => this.openChannel(channel, peer))
    );
  }

  private negotiateResponder(
    peer: RTCPeerConnection,
    incoming: Observable<RTCDataChannel>,
    ice: IceHandle
  ): Observable<RtcChannel> {
    return this.signaling.receiveSealed('rtc-offer', parseRtcOffer).pipe(
      switchMap((offer) =>
        from(peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp }))
      ),
      tap(() => ice.flush()),
      switchMap(() => from(peer.createAnswer())),
      switchMap((answer) => from(peer.setLocalDescription(answer))),
      tap(() =>
        this.sendSignal('rtc-answer', { sdp: peer.localDescription?.sdp ?? '' })
      ),
      switchMap(() => incoming),
      switchMap((channel) => this.openChannel(channel, peer))
    );
  }

  private attachIce(peer: RTCPeerConnection): IceHandle {
    const pending: RTCIceCandidateInit[] = [];
    peer.onicecandidate = (event) => {
      this.sendSignal('rtc-ice', {
        candidate: event.candidate?.candidate ?? null
      });
    };
    const sub = this.signaling
      .sealed$('rtc-ice', parseRtcIce)
      .subscribe(({ candidate }) => {
        if (candidate === null) return;
        const init: RTCIceCandidateInit = { candidate };
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
      dispose: () => sub.unsubscribe()
    };
  }

  private openChannel(
    channel: RTCDataChannel,
    peer: RTCPeerConnection
  ): Observable<RtcChannel> {
    return new Observable<RtcChannel>((subscriber) => {
      const messages = new ReplaySubject<ArrayBuffer>();
      channel.binaryType = 'arraybuffer';
      channel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_LOW;

      channel.onopen = () => {
        subscriber.next({
          send: (data) => this.sendData(channel, data),
          messages$: messages.asObservable(),
          close: () => {
            channel.close();
            peer.close();
          }
        });
        subscriber.complete();
      };
      channel.onmessage = (event) => messages.next(event.data as ArrayBuffer);
      channel.onerror = () => subscriber.error(new Error('data channel error'));
      channel.onclose = () => {
        messages.complete();
        subscriber.error(new Error('data channel closed'));
      };
    });
  }

  private sendData(
    channel: RTCDataChannel,
    data: ArrayBuffer
  ): Observable<void> {
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

  private sendSignal(kind: SealedKind, payload: unknown): void {
    this.signaling
      .sendSealed(kind, payload)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}
