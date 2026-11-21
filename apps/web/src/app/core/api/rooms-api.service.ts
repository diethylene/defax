import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import { RoomCreated } from '@contract/signal/room-created.model';
import { pipe } from 'effect/Function';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { catchError, map, type Observable, of, timeout } from 'rxjs';
import { type RoomsApiError, RoomsRequestFailed, RoomsWireError } from './rooms-api-errors.model';

/** A create is a write; it is abandoned rather than retried after this long. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Envelope the rooms endpoint returns on success. */
const RoomCreatedEnvelope = apiEnvelopeOf(RoomCreated);

/**
 * Reads the response body of a failure; undefined when there was no HTTP response.
 * @param error The failure.
 * @returns The raw error body.
 */
const bodyOf = (error: unknown): unknown =>
  error instanceof HttpErrorResponse ? error.error : undefined;

/**
 * Decodes a successful body into the created room.
 * @param body Raw response body.
 * @returns The created room, or a request failure when the body does not match the envelope.
 */
const decodeRoomCreated = (body: unknown): Result.Result<RoomCreated, RoomsApiError> =>
  pipe(
    Schema.decodeUnknownResult(RoomCreatedEnvelope)(body),
    Result.map((envelope) => envelope.data),
    Result.mapError((cause) => new RoomsRequestFailed({ cause })),
  );

/**
 * Decodes an HTTP failure into the wire problem, or a request failure.
 * @param error The HTTP error (or timeout) that ended the call.
 * @returns A failed Result carrying the decoded failure.
 */
const decodeFailure = (error: unknown): Result.Result<never, RoomsApiError> =>
  pipe(
    Schema.decodeUnknownResult(RoomsWireError)(bodyOf(error)),
    Result.match({
      onSuccess: (problem) => Result.fail(problem),
      onFailure: () => Result.fail(new RoomsRequestFailed({ cause: error })),
    }),
  );

/** Typed access to the room creation endpoint; every response is decoded with the shared schemas. */
@Injectable({ providedIn: 'root' })
export class RoomsApiService {
  /** Angular HTTP client. */
  private readonly http = inject(HttpClient);

  /**
   * Creates a room; a write, so it never retries.
   * @param baseUrl API origin; an empty string means same-origin relative paths.
   * @returns The created room or a typed failure; never errors.
   */
  createRoom(baseUrl: string): Observable<Result.Result<RoomCreated, RoomsApiError>> {
    return this.http.post<unknown>(`${baseUrl}/rooms/create`, null).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map(decodeRoomCreated),
      catchError((error: unknown) => of(decodeFailure(error))),
    );
  }
}
