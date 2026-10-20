import { Injectable, inject } from '@angular/core';
import { catchError, EMPTY, firstValueFrom } from 'rxjs';
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
  send(data: ArrayBuffer): Promise<void>;
  receive(): Promise<ArrayBuffer>;
  close(): void;
}

interface Waiter {
  resolve: (value: ArrayBuffer) => void;
  reject: (error: Error) => void;
}

interface IceHandle {
  flush: () => void;
  dispose: () => void;
}

const CONNECT_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('connection timed out')), ms)
    )
  ]);
}

@Injectable({ providedIn: 'root' })
export class WebRtcService {
  private readonly signaling = inject(SignalingService);

  openInitiator(): Promise<RtcChannel> {
    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    const channel = peer.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true
    });
    const ice = this.attachIce(peer);
    return withTimeout(
      this.exchangeAsInitiator(peer, channel, ice),
      CONNECT_TIMEOUT_MS
    ).finally(() => ice.dispose());
  }

  openResponder(): Promise<RtcChannel> {
    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    const ice = this.attachIce(peer);
    const channel = this.awaitDataChannel(peer);
    return withTimeout(
      this.exchangeAsResponder(peer, channel, ice),
      CONNECT_TIMEOUT_MS
    ).finally(() => ice.dispose());
  }

  private async exchangeAsInitiator(
    peer: RTCPeerConnection,
    channel: RTCDataChannel,
    ice: IceHandle
  ): Promise<RtcChannel> {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.sendSignal('rtc-offer', { sdp: peer.localDescription?.sdp ?? '' });
    const answer = await firstValueFrom(
      this.signaling.receiveSealed('rtc-answer', parseRtcAnswer)
    );
    await peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    ice.flush();
    return this.openChannel(channel);
  }

  private async exchangeAsResponder(
    peer: RTCPeerConnection,
    channel: Promise<RTCDataChannel>,
    ice: IceHandle
  ): Promise<RtcChannel> {
    const offer = await firstValueFrom(
      this.signaling.receiveSealed('rtc-offer', parseRtcOffer)
    );
    await peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    ice.flush();
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    this.sendSignal('rtc-answer', { sdp: peer.localDescription?.sdp ?? '' });
    return this.openChannel(await channel);
  }

  private awaitDataChannel(peer: RTCPeerConnection): Promise<RTCDataChannel> {
    return new Promise((resolve) => {
      peer.ondatachannel = (event) => resolve(event.channel);
    });
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

  private openChannel(channel: RTCDataChannel): Promise<RtcChannel> {
    return new Promise((resolve, reject) => {
      const queue: ArrayBuffer[] = [];
      const waiters: Waiter[] = [];
      let closed = false;

      channel.binaryType = 'arraybuffer';
      channel.bufferedAmountLowThreshold = DATA_CHANNEL_BUFFER_LOW;

      const fail = (error: Error): void => {
        closed = true;
        for (const waiter of waiters.splice(0)) waiter.reject(error);
        reject(error);
      };

      const receive = (): Promise<ArrayBuffer> =>
        new Promise((res, rej) => {
          const next = queue.shift();
          if (next) {
            res(next);
          } else if (closed) {
            rej(new Error('data channel closed'));
          } else {
            waiters.push({ resolve: res, reject: rej });
          }
        });

      channel.onopen = () =>
        resolve({
          send: (data) => this.sendData(channel, data),
          receive,
          close: () => channel.close()
        });
      channel.onmessage = (event) => {
        const data = event.data as ArrayBuffer;
        const waiter = waiters.shift();
        if (waiter) waiter.resolve(data);
        else queue.push(data);
      };
      channel.onerror = () => fail(new Error('data channel error'));
      channel.onclose = () => fail(new Error('data channel closed'));
    });
  }

  private sendData(channel: RTCDataChannel, data: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (channel.readyState !== 'open') {
        reject(new Error('data channel not open'));
        return;
      }
      const onLow = (): void => {
        cleanup();
        resolve();
      };
      const onClose = (): void => {
        cleanup();
        reject(new Error('data channel closed'));
      };
      const cleanup = (): void => {
        channel.removeEventListener('bufferedamountlow', onLow);
        channel.removeEventListener('close', onClose);
      };
      channel.send(data);
      if (channel.bufferedAmount <= DATA_CHANNEL_BUFFER_LOW) {
        resolve();
        return;
      }
      channel.addEventListener('bufferedamountlow', onLow);
      channel.addEventListener('close', onClose);
    });
  }

  private sendSignal(kind: SealedKind, payload: unknown): void {
    this.signaling
      .sendSealed(kind, payload)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}
