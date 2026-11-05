import type { Observable } from 'rxjs';

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
export interface IceHandle {
  /** Adds every held candidate to the peer. */
  flush: () => void;
  /** Stops listening for candidates. */
  dispose: () => void;
}
