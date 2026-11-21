import { InjectionToken } from '@angular/core';

/** Socket events and calls the relay transport uses. */
export interface TransportSocket {
  /** Called when the socket opens. */
  onopen: ((event: Event) => void) | null;
  /** Called for every frame the relay sends. */
  onmessage: ((event: MessageEvent) => void) | null;
  /** Called when the socket fails. */
  onerror: ((event: Event) => void) | null;
  /** Called when the socket closes. */
  onclose: ((event: CloseEvent) => void) | null;
  /** Current connection state. */
  readonly readyState: number;
  /** Writes one frame. */
  send(data: string): void;
  /** Closes the connection. */
  close(code?: number, reason?: string): void;
}

/** Constructor the transport uses to open relay sockets. */
export interface WebSocketConstructor {
  /** Opens one socket to a URL. */
  new (url: string): TransportSocket;
}

/** Constructor token, so tests can substitute a fake socket. */
export const WEB_SOCKET_CONSTRUCTOR = new InjectionToken<WebSocketConstructor>(
  'WEB_SOCKET_CONSTRUCTOR',
);
