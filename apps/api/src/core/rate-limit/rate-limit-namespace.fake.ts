import { RateLimiterDo } from '@api/core/rate-limit/rate-limiter.do';
import { FakeRateLimitState } from '@api/core/rate-limit/rate-limiter.do.harness';

/**
 * Builds an in-memory Durable Object id.
 * @param name Name the id was derived from.
 * @returns An id usable by the fake namespace.
 */
const fakeId = (name: string): DurableObjectId => ({
  toString: () => name,
  equals: (other) => other.toString() === name,
  name,
});

/**
 * Builds an in-memory Durable Object stub.
 * @param id Id of the resolved object.
 * @param fetch Handler for requests sent to the stub.
 * @returns A stub exposing the fetch surface the limiter uses.
 */
const stubFor = (
  id: DurableObjectId,
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): DurableObjectStub<RateLimiterDo> =>
  // The limiter only calls fetch; the RPC surface cannot be built without the runtime.
  ({ id, fetch }) as unknown as DurableObjectStub<RateLimiterDo>;

/** In-memory namespace that routes consume calls to a real limiter over fake state. */
export class FakeRateLimiterNamespace implements DurableObjectNamespace<RateLimiterDo> {
  /** Whether the limiter's fetch rejects instead of answering. */
  private readonly failing: boolean;
  /** The single limiter instance shared by every resolved id. */
  private readonly limiter: RateLimiterDo;

  /**
   * Builds a namespace.
   * @param options Fake options.
   * @param options.failing Whether the limiter's fetch rejects.
   */
  constructor(options: { failing?: boolean } = {}) {
    this.failing = options.failing ?? false;
    this.limiter = new RateLimiterDo(new FakeRateLimitState() as unknown as DurableObjectState, {});
  }

  /**
   * Builds a namespace whose limiter fetch rejects.
   * @returns The failing namespace.
   */
  static failing(): FakeRateLimiterNamespace {
    return new FakeRateLimiterNamespace({ failing: true });
  }

  /**
   * Derives an id from a name.
   * @param name Name to derive from.
   * @returns The derived id.
   */
  idFromName(name: string): DurableObjectId {
    return fakeId(name);
  }

  /**
   * Draws an unused id.
   * @returns A fresh id.
   */
  newUniqueId(): DurableObjectId {
    return fakeId(crypto.randomUUID());
  }

  /**
   * Reads an id from its string form.
   * @param id String form of the id.
   * @returns The parsed id.
   */
  idFromString(id: string): DurableObjectId {
    return fakeId(id);
  }

  /**
   * Resolves a stub that forwards consume calls to the limiter.
   * @param id Id of the object to resolve.
   * @returns The stub for that object.
   */
  get(id: DurableObjectId): DurableObjectStub<RateLimiterDo> {
    return stubFor(id, (input, init) => this.handle(input, init));
  }

  /**
   * Resolves a stub by name.
   * @param name Name of the object to resolve.
   * @returns The stub for that object.
   */
  getByName(name: string): DurableObjectStub<RateLimiterDo> {
    return this.get(this.idFromName(name));
  }

  /**
   * Returns the same namespace; the fake has no jurisdictions.
   * @returns This namespace.
   */
  jurisdiction(): DurableObjectNamespace<RateLimiterDo> {
    return this;
  }

  /**
   * Answers a consume call through the limiter, or rejects when failing.
   * @param input Request to send.
   * @param init Request options.
   * @returns The limiter's response.
   */
  private async handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (this.failing) throw new Error('rate limiter unavailable');
    return this.limiter.fetch(new Request(input, init));
  }
}
