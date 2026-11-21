import { Injectable } from '@angular/core';
import type { RoomCreated } from '@contract/signal/room-created.model';
import type * as Result from 'effect/Result';
import type { Observable } from 'rxjs';
import type { RoomsApiError } from './rooms-api-errors.model';

/** Typed access to the room creation endpoint; every response is decoded with the shared schemas. */
@Injectable({ providedIn: 'root' })
export class RoomsApiService {
  /**
   * Creates a room; a write, so it never retries.
   * @param baseUrl API origin; an empty string means same-origin relative paths.
   * @returns The created room or a typed failure; never errors.
   */
  createRoom(baseUrl: string): Observable<Result.Result<RoomCreated, RoomsApiError>> {
    void baseUrl;
    throw new Error('RoomsApiService.createRoom is not implemented');
  }
}
