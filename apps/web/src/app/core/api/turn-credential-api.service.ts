import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import { IceServersResponse } from '@contract/turn/ice-servers.model';
import { pipe } from 'effect/Function';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { catchError, map, type Observable, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type TurnCredentialApiError,
  TurnCredentialRequestFailed,
  TurnCredentialWireError,
} from './turn-credential-api-errors.model';

/** Envelope the credential endpoint returns on success. */
const IceServersEnvelope = apiEnvelopeOf(IceServersResponse);

/**
 * Reads the response body of a failure; undefined when there was no HTTP response.
 * @param error The failure.
 * @returns The raw error body.
 */
const bodyOf = (error: unknown): unknown =>
  error instanceof HttpErrorResponse ? error.error : undefined;

/**
 * Decodes a successful body into the minted ICE servers.
 * @param body Raw response body.
 * @returns The ICE servers, or a request failure when the body does not match the envelope.
 */
const decodeIceServers = (
  body: unknown,
): Result.Result<IceServersResponse, TurnCredentialApiError> =>
  pipe(
    Schema.decodeUnknownResult(IceServersEnvelope)(body),
    Result.map((envelope) => envelope.data),
    Result.mapError((cause) => new TurnCredentialRequestFailed({ cause })),
  );

/**
 * Decodes an HTTP failure into the wire problem, or a request failure.
 * @param error The HTTP error (or timeout) that ended the call.
 * @returns A failed Result carrying the decoded failure.
 */
const decodeFailure = (error: unknown): Result.Result<never, TurnCredentialApiError> =>
  pipe(
    Schema.decodeUnknownResult(TurnCredentialWireError)(bodyOf(error)),
    Result.match({
      onSuccess: (problem) => Result.fail(problem),
      onFailure: () => Result.fail(new TurnCredentialRequestFailed({ cause: error })),
    }),
  );

/** Typed access to the credential endpoint; every response is decoded with the shared schemas. */
@Injectable({ providedIn: 'root' })
export class TurnCredentialApiService {
  /** Angular HTTP client. */
  private readonly http = inject(HttpClient);

  /**
   * Mints TURN credentials; a write, so it never retries.
   * @param baseUrl API origin; an empty string means same-origin relative paths.
   * @returns The ICE servers or a typed failure; never errors.
   */
  getIceServers(
    baseUrl: string,
  ): Observable<Result.Result<IceServersResponse, TurnCredentialApiError>> {
    return this.http.post<unknown>(`${baseUrl}/turn/credentials`, null).pipe(
      timeout(environment.timeouts.request),
      map(decodeIceServers),
      catchError((error: unknown) => of(decodeFailure(error))),
    );
  }
}
