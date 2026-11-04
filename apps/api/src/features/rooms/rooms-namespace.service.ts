import type { Room } from '@api/features/room/room';
import * as Context from 'effect/Context';

/** Binding to the Durable Object namespace that holds rooms. */
export const RoomsNamespace = Context.Service<{
  /** The `ROOMS` namespace binding. */
  readonly namespace: DurableObjectNamespace<Room>;
}>('RoomsNamespace');
