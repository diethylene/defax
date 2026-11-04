import type { ProblemDetails } from '@contract/http/problem-details.model';

/**
 * Builds an RFC 7807 problem+json response.
 * @param status HTTP status code.
 * @param title Short summary of the problem.
 * @param detail Optional specifics for the client.
 * @returns The problem response, tagged with a fresh request id.
 */
export const problemResponse = (status: number, title: string, detail?: string): Response => {
  const requestId = crypto.randomUUID();
  const body: ProblemDetails = {
    type: 'about:blank',
    title,
    status,
    ...(detail === undefined ? {} : { detail }),
    requestId,
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/problem+json',
      'x-request-id': requestId,
    },
  });
};
