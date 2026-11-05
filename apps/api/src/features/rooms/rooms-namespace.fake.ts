import type { Room } from '@api/features/room/room';

/** One room init recorded by the fake namespace. */
export interface FakeRoomInit {
  /** Name the stub was resolved with, which is the room code. */
  readonly name: string;
  /** Session id sent in the init body. */
  readonly sid: string;
}

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
 * @returns A stub exposing the fetch surface the handler uses.
 */
const stubFor = (
  id: DurableObjectId,
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): DurableObjectStub<Room> =>
  // The handler only calls fetch; the RPC surface cannot be built without the runtime.
  ({ id, fetch }) as unknown as DurableObjectStub<Room>;

/** In-memory Durable Object namespace that records room init calls. */
export class FakeRoomsNamespace implements DurableObjectNamespace<Room> {
  /** Room init calls in arrival order. */
  readonly inits: FakeRoomInit[] = [];
  /** Whether init requests answer 500 instead of 204. */
  private readonly failing: boolean;

  /**
   * Builds a namespace.
   * @param failing Whether init requests answer 500.
   */
  constructor(failing = false) {
    this.failing = failing;
  }

  /**
   * Builds a namespace whose init requests fail.
   * @returns The failing namespace.
   */
  static failing(): FakeRoomsNamespace {
    return new FakeRoomsNamespace(true);
  }

  /**
   * Derives an id from a room code.
   * @param name Room code.
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
   * Resolves a stub and records the init calls it receives.
   * @param id Id of the object to resolve.
   * @returns The stub for that object.
   */
  get(id: DurableObjectId): DurableObjectStub<Room> {
    return stubFor(id, (input, init) => this.handleInit(id, new Request(input, init)));
  }

  /**
   * Resolves a stub by name.
   * @param name Name of the object to resolve.
   * @returns The stub for that object.
   */
  getByName(name: string): DurableObjectStub<Room> {
    return this.get(this.idFromName(name));
  }

  /**
   * Returns the same namespace; the fake has no jurisdictions.
   * @returns This namespace.
   */
  jurisdiction(): DurableObjectNamespace<Room> {
    return this;
  }

  /**
   * Records an init call and answers the configured status.
   * @param id Id of the object that received the request.
   * @param request Init request.
   * @returns The init response.
   */
  private async handleInit(id: DurableObjectId, request: Request): Promise<Response> {
    const sid = await request.text();
    this.inits.push({ name: id.name ?? id.toString(), sid });
    return this.failing ? new Response(null, { status: 500 }) : new Response(null, { status: 204 });
  }
}
