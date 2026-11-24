import type { Environment } from './environment.interface';

/** Settings for production builds. */
export const environment: Environment = {
  apiBaseUrl: 'https://api.defax.axelson.gg',
  rtc: { stunUrls: ['stun:stun.cloudflare.com:3478'] },
  transfer: { chunkSize: 256 * 1024, bufferLow: 1024 * 1024, relayThrottleBytesPerSecond: 625_000 },
  timeouts: { connect: 30_000, request: 10_000, routePollInterval: 250, routePollAttempts: 3 },
  ui: { copiedReset: 2000, sampleInterval: 1000 },
};
