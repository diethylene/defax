import type { ProblemDetails } from '@contract/http/problem-details.model';

/** Header carrying the request correlation id. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Standard titles for the error statuses the API returns. */
const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/**
 * Reads an error status's standard title.
 * @param status HTTP status code.
 * @returns The title, or a generic fallback for statuses outside the catalog.
 */
export const titleFor = (status: number): string => STATUS_TITLES[status] ?? 'HTTP error';

/**
 * Builds the problem details for a failed response.
 * @param status HTTP status code.
 * @param requestId Correlation id for this response.
 * @param timestamp When the response was produced.
 * @returns The problem details body.
 */
export const problemDetails = (
  status: number,
  requestId: string,
  timestamp: string,
): ProblemDetails => ({
  type: 'about:blank',
  title: titleFor(status),
  status,
  requestId,
  timestamp,
});
