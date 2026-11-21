/** Socket protocol matching each page or API protocol. */
const SOCKET_PROTOCOLS: Readonly<Record<string, string>> = {
  'http:': 'ws:',
  'https:': 'wss:',
};

/**
 * Maps an HTTP protocol to the socket protocol.
 * @param protocol Protocol of a page or API URL.
 * @returns The matching ws or wss protocol.
 */
const socketProtocol = (protocol: string): string => SOCKET_PROTOCOLS[protocol] ?? 'ws:';

/**
 * Derives the WebSocket origin of the current page.
 * @returns The current origin with a ws or wss scheme.
 */
const currentSocketOrigin = (): string =>
  `${socketProtocol(window.location.protocol)}//${window.location.host}`;

/**
 * Derives the WebSocket origin of an API base URL.
 * @param baseUrl HTTP origin of the API.
 * @returns The same origin with a ws or wss scheme.
 */
const socketOriginOf = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  return `${socketProtocol(url.protocol)}//${url.host}`;
};

/**
 * Derives the relay WebSocket base from the API base URL.
 * @param baseUrl API origin; an empty string means the current page's origin.
 * @returns The ws or wss origin the relay sockets hang from.
 */
export const websocketBaseFrom = (baseUrl: string): string =>
  baseUrl === '' ? currentSocketOrigin() : socketOriginOf(baseUrl);
