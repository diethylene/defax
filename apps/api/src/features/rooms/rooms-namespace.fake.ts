import type { Room } from '@api/features/room/room';
import * as Match from 'effect/Match';

/** One room init recorded by the fake namespace. */
export interface FakeRoomInit {
  /** Name the stub was resolved with, which is the room code. */
  readonly name: string;
  /** Session id sent in the init body. */
  readonly sid: string;
}

/** One room ws upgrade recorded by the fake namespace. */
export interface FakeRoomUpgrade {
  /** Name the stub was resolved with, which is the room code. */
  readonly name: string;
  /** URL of the forwarded handshake request. */
  readonly url: string;
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

/**
 * Builds a response with an arbitrary status.
 * @param status Status the stub answers with.
 * @returns A response carrying that status.
 */
const responseWithStatus = (status: number): Response =>
  // Node's Response rejects the 1xx upgrade status the Workers runtime allows.
  ({ status, headers: new Headers() }) as unknown as Response;

/** In-memory Durable Object namespace that records room init and upgrade calls. */
export class FakeRoomsNamespace implements DurableObjectNamespace<Room> {
  /** Room init calls in arrival order. */
  readonly inits: FakeRoomInit[] = [];
  /** Room ws upgrade calls in arrival order. */
  readonly upgrades: FakeRoomUpgrade[] = [];
  /** Whether init requests answer 500 instead of 204. */
  private readonly failing: boolean;
  /** Status ws upgrade requests answer with. */
  private readonly upgradeStatus: number;

  /**
   * Builds a namespace.
   * @param failing Whether init requests answer 500.
   * @param upgradeStatus Status ws upgrade requests answer with.
   */
  constructor(failing = false, upgradeStatus = 101) {
    this.failing = failing;
    this.upgradeStatus = upgradeStatus;
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
   * Resolves a stub and records the calls it receives.
   * @param id Id of the object to resolve.
   * @returns The stub for that object.
   */
  get(id: DurableObjectId): DurableObjectStub<Room> {
    return stubFor(id, (input, init) => this.handle(id, new Request(input, init)));
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
   * Routes a request by its path action, defaulting to init.
   * @param id Id of the object that received the request.
   * @param request Request sent to the stub.
   * @returns The stub's response.
   */
  private handle(id: DurableObjectId, request: Request): Promise<Response> {
    const action = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    return Match.value(action).pipe(
      Match.when('ws', () => this.handleUpgrade(id, request)),
      Match.orElse(() => this.handleInit(id, request)),
    );
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

  /**
   * Records a ws upgrade and answers the configured status.
   * @param id Id of the object that received the request.
   * @param request Upgrade request.
   * @returns The upgrade response.
   */
  private handleUpgrade(id: DurableObjectId, request: Request): Promise<Response> {
    this.upgrades.push({ name: id.name ?? id.toString(), url: request.url });
    return Promise.resolve(responseWithStatus(this.upgradeStatus));
  }
}
