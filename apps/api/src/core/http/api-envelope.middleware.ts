import { AppConfig } from '@api/core/config/app-config.service';
import type { ApiMeta } from '@contract/http/api-meta.model';
import type { ProblemDetails } from '@contract/http/problem-details.model';
import * as Effect from 'effect/Effect';
import { HttpServerResponse } from 'effect/http';
import { type HttpApiEndpoint, HttpApiError, HttpApiMiddleware } from 'effect/http-api';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/** A server response as the HTTP API runtime models it. */
type ServerResponse = HttpServerResponse.HttpServerResponse;

/** Status at which a response stops being a success. */
const SUCCESS_STATUS_LIMIT = 300;
/** Header carrying the request correlation id. */
const REQUEST_ID_HEADER = 'x-request-id';

/** Standard titles for the error statuses the API returns. */
const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

/**
 * Reads an error status's standard title.
 * @param status HTTP status code.
 * @returns The title, or a generic fallback for statuses outside the catalog.
 */
const titleFor = (status: number): string => STATUS_TITLES[status] ?? 'HTTP error';

/**
 * Reads a response's body as text.
 * @param response Response to inspect.
 * @returns The body text, or null when the response has no buffered body.
 */
const bodyText = (response: ServerResponse): string | null => {
  const body = response.body;
  return body._tag === 'Uint8Array' ? (body.text ?? new TextDecoder().decode(body.body)) : null;
};

/**
 * Decodes a response's JSON body.
 * @param response Response to inspect.
 * @returns The decoded body, or null when the body is absent or not JSON.
 */
const bodyJson = (response: ServerResponse): unknown => {
  const text = bodyText(response);
  return text === null
    ? null
    : Option.getOrNull(Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))(text));
};

/**
 * Builds the problem details for a failed response.
 * @param status HTTP status code.
 * @param requestId Correlation id for this response.
 * @param timestamp When the response was produced.
 * @returns The problem details body.
 */
const problemDetails = (status: number, requestId: string, timestamp: string): ProblemDetails => ({
  type: 'about:blank',
  title: titleFor(status),
  status,
  requestId,
  timestamp,
});

/**
 * Re-encodes one endpoint response as an envelope or a problem.
 * @param response Response produced by the endpoint.
 * @param apiVersion Deployed API version.
 * @returns The re-encoded response, tagged with a fresh request id.
 */
export const wrapResponse = (response: ServerResponse, apiVersion: string): ServerResponse => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const meta: ApiMeta = { requestId, timestamp, apiVersion };
  const success = response.status < SUCCESS_STATUS_LIMIT;
  const payload = success
    ? { status: 'success' as const, data: bodyJson(response), meta }
    : problemDetails(response.status, requestId, timestamp);
  return HttpServerResponse.jsonUnsafe(payload, {
    status: response.status,
    contentType: success ? 'application/json' : 'application/problem+json',
  }).pipe(HttpServerResponse.setHeader(REQUEST_ID_HEADER, requestId));
};

/** Schema of the HTTP status annotation the API runtime attaches to responses. */
const HttpStatusAnnotation = Schema.Struct({
  httpApiStatus: Schema.optional(Schema.Number),
});

/**
 * Reads the status a failed handler declared for its endpoint.
 * @param endpoint Endpoint whose handler failed.
 * @returns The single declared error status, or 500 when none is unambiguous.
 */
const errorStatus = (endpoint: HttpApiEndpoint.Top): number => {
  const statuses = Array.from(endpoint.error).flatMap((schema) =>
    Option.match(
      Option.flatMap(
        Schema.decodeUnknownOption(HttpStatusAnnotation)(schema.ast.annotations),
        (annotation) => Option.fromNullishOr(annotation.httpApiStatus),
      ),
      { onNone: () => [], onSome: (status) => [status] },
    ),
  );
  return statuses.length === 1 ? (statuses[0] ?? 500) : 500;
};

/**
 * Builds the middleware implementation used by the API.
 * @param apiVersion Deployed API version.
 * @returns The middleware that wraps every endpoint response.
 */
const middlewareFor =
  (apiVersion: string): HttpApiMiddleware.HttpApiMiddleware<never, never, AppConfig> =>
  (httpEffect, { endpoint }) =>
    Effect.catch(httpEffect, (error) =>
      HttpApiError.HttpApiSchemaError.is(error)
        ? Effect.fail(error)
        : Effect.succeed(HttpServerResponse.empty({ status: errorStatus(endpoint) })),
    ).pipe(Effect.map((response) => wrapResponse(response, apiVersion)));

/** Wraps every endpoint response in the success envelope or in problem+json. */
export class ApiEnvelopeMiddleware extends HttpApiMiddleware.Service<
  ApiEnvelopeMiddleware,
  { requires: AppConfig }
>()('ApiEnvelopeMiddleware') {
  /** Layer providing the middleware from the app's configuration. */
  static readonly layer = Layer.effect(
    ApiEnvelopeMiddleware,
    Effect.map(AppConfig, (config) => middlewareFor(config.version)),
  );
}
