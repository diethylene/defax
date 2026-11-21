import type { TransportSocket } from './web-socket-constructor.token';

/** In-memory socket the transport tests drive by hand. */
export class FakeWebSocket implements TransportSocket {
  /** Ready state before the connection opens. */
  static readonly CONNECTING = 0;
  /** Ready state once the connection is open. */
  static readonly OPEN = 1;
  /** Ready state after the connection closed. */
  static readonly CLOSED = 3;
  /** Every socket opened through the constructor, oldest first. */
  static readonly instances: FakeWebSocket[] = [];

  /** URL the socket was opened with. */
  readonly url: string;
  /** Frames written through send, in order. */
  readonly sent: string[] = [];
  /** Called when the socket opens. */
  onopen: ((event: Event) => void) | null = null;
  /** Called for every frame the relay sends. */
  onmessage: ((event: MessageEvent) => void) | null = null;
  /** Called when the socket fails. */
  onerror: ((event: Event) => void) | null = null;
  /** Called when the socket closes. */
  onclose: ((event: CloseEvent) => void) | null = null;
  /** Current connection state. */
  readyState = FakeWebSocket.CONNECTING;

  /**
   * Records the socket so the test can drive it.
   * @param url URL the transport asked for.
   */
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  /** Clears the recorded sockets between tests. */
  static reset(): void {
    FakeWebSocket.instances.length = 0;
  }

  /**
   * Writes one frame.
   * @param data Frame text.
   */
  send(data: string): void {
    this.sent.push(data);
  }

  /** Closes the connection as the client would. */
  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  /** Opens the connection and reports it. */
  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  /**
   * Delivers one frame from the relay.
   * @param data Frame payload, serialized as the socket would.
   */
  receive(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  /** Fails the connection as the browser would. */
  fail(): void {
    this.onerror?.(new Event('error'));
  }

  /** Closes the connection from the relay side. */
  closeFromRelay(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}
