/** An in-memory WebSocket that records what the room sends it. */
export class FakeWebSocket {
  /** Frames the room sent to this socket. */
  readonly sent: string[] = [];
  /** Whether the room closed this socket. */
  closed = false;
  /** Close code the room passed, when it closed the socket. */
  closeCode: number | null = null;
  /** Close reason the room passed, when it closed the socket. */
  closeReason: string | null = null;

  /**
   * Records a frame instead of writing it to a peer.
   * @param data The frame text.
   */
  send(data: string): void {
    this.sent.push(data);
  }

  /**
   * Records that the room closed the socket.
   * @param code Close code, when the room passed one.
   * @param reason Close reason, when the room passed one.
   */
  close(code?: number, reason?: string): void {
    this.closed = true;
    this.closeCode = code ?? null;
    this.closeReason = reason ?? null;
  }
}

/** A pair of in-memory sockets, the shape `new WebSocketPair()` returns. */
export class FakeWebSocketPair {
  /** Client side handed back in the upgrade response. */
  0: FakeWebSocket;
  /** Server side accepted by the Durable Object. */
  1: FakeWebSocket;

  /** Builds both ends of the pair. */
  constructor() {
    this[0] = new FakeWebSocket();
    this[1] = new FakeWebSocket();
  }
}

/** In-memory storage with the slice of the Durable Object API the room uses. */
export class FakeStorage {
  /** Stored keys and values. */
  readonly store = new Map<string, unknown>();
  /** Scheduled alarm time in milliseconds, when one is armed. */
  alarm: number | null = null;
  /** Whether the room erased all storage. */
  deletedAll = false;

  /**
   * Reads one key.
   * @param key Key to read.
   * @returns The stored value, or undefined when absent.
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  /**
   * Writes one key and value.
   * @param key Key to write.
   * @param value Value to store.
   */
  async put(key: string, value: unknown): Promise<void>;
  /**
   * Writes several keys at once.
   * @param entries Keys and values to store.
   */
  async put(entries: Record<string, unknown>): Promise<void>;
  /**
   * Writes one key or several, depending on the first argument's shape.
   * @param keyOrEntries Key, or a record of keys and values.
   * @param value Value for the single-key form.
   */
  async put(keyOrEntries: string | Record<string, unknown>, value?: unknown): Promise<void> {
    if (typeof keyOrEntries === 'string') {
      this.store.set(keyOrEntries, value);
      return;
    }
    Object.entries(keyOrEntries).forEach(([key, entry]) => {
      this.store.set(key, entry);
    });
  }

  /** Clears every key and marks the storage erased. */
  async deleteAll(): Promise<void> {
    this.store.clear();
    this.deletedAll = true;
  }

  /**
   * Reads the armed alarm.
   * @returns The alarm time, or null when none is armed.
   */
  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }

  /**
   * Arms an alarm at the given time.
   * @param scheduledTime Time to fire, as a number or a date.
   */
  async setAlarm(scheduledTime: number | Date): Promise<void> {
    this.alarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime();
  }

  /** Disarms the alarm. */
  async deleteAlarm(): Promise<void> {
    this.alarm = null;
  }
}

/** In-memory Durable Object state with storage and WebSocket bookkeeping. */
export class FakeState {
  /** Storage the room reads and writes. */
  readonly storage = new FakeStorage();
  /** Sockets accepted by the room, in acceptance order. */
  private readonly sockets: FakeWebSocket[] = [];
  /** Tags attached to each accepted socket. */
  private readonly tags = new Map<FakeWebSocket, string[]>();

  /**
   * Accepts a socket with the given tags.
   * @param ws Socket to accept.
   * @param tags Tags the room can later query.
   */
  acceptWebSocket(ws: FakeWebSocket, tags: string[] = []): void {
    this.sockets.push(ws);
    this.tags.set(ws, tags);
  }

  /**
   * Lists accepted sockets, optionally filtered by tag.
   * @param tag Tag to filter by, when given.
   * @returns The matching sockets.
   */
  getWebSockets(tag?: string): FakeWebSocket[] {
    if (tag === undefined) return [...this.sockets];
    return this.sockets.filter((ws) => (this.tags.get(ws) ?? []).includes(tag));
  }

  /**
   * Reads a socket's tags.
   * @param ws Socket to inspect.
   * @returns The socket's tags.
   */
  getTags(ws: FakeWebSocket): string[] {
    return this.tags.get(ws) ?? [];
  }
}

/** Installs the fake WebSocket pair as the global the room constructs. */
export const installWebSocketPair = (): void => {
  (globalThis as unknown as { WebSocketPair: unknown }).WebSocketPair = FakeWebSocketPair;
};

/** Patches the global Response so an upgrade can answer with status 101 and a socket. */
export const patchResponse = (): void => {
  const Original = globalThis.Response;
  globalThis.Response = function Response(body?: BodyInit | null, init?: ResponseInit): Response {
    if (init?.webSocket !== undefined) {
      const response = new Original(null, { status: 200 });
      Object.defineProperty(response, 'status', { value: 101 });
      Object.defineProperty(response, 'webSocket', { value: init.webSocket });
      return response;
    }
    return new Original(body, init);
  } as unknown as typeof Response;
};
