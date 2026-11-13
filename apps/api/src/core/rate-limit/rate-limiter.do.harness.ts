/** In-memory storage with the slice of the Durable Object API the limiter uses. */
export class FakeRateLimitStorage {
  /** Stored keys and values. */
  readonly store = new Map<string, unknown>();

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
  async put(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

/** In-memory Durable Object state for the limiter spec. */
export class FakeRateLimitState {
  /** Storage the limiter reads and writes. */
  readonly storage = new FakeRateLimitStorage();

  /**
   * Runs a callback as the only concurrent work on the object.
   * @param callback Work to run.
   * @returns The work's result.
   */
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  }
}
