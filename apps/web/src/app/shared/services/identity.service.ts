import { Injectable } from '@angular/core';
import type { Identity } from '@contract/signal/identity.model';
import * as Match from 'effect/Match';

/** Edge version pattern in the user agent. */
const EDGE = /Edg\/(\d+)/;
/** Chrome version pattern in the user agent. */
const CHROME = /Chrome\/(\d+)/;
/** Firefox version pattern in the user agent. */
const FIREFOX = /Firefox\/(\d+)/;
/** Safari version pattern in the user agent. */
const SAFARI = /Version\/(\d+)/;

/** Reads the peer identity from the browser environment. */
@Injectable({ providedIn: 'root' })
export class IdentityService {
  /**
   * Detects the browser, OS, time zone, and language of this peer.
   * @returns The detected identity.
   */
  detect(): Identity {
    const userAgent = navigator.userAgent;
    return {
      browser: browserName(userAgent),
      os: osName(userAgent),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }
}

/**
 * Names the browser from its user agent.
 * @param userAgent Browser user agent.
 * @returns Browser name with its version, or a fallback label.
 */
const browserName = (userAgent: string): string =>
  Match.value(userAgent).pipe(
    Match.when(
      (ua) => EDGE.test(ua),
      (ua) => `Edge ${capture(EDGE, ua)}`
    ),
    Match.when(
      (ua) => CHROME.test(ua),
      (ua) => `Chrome ${capture(CHROME, ua)}`
    ),
    Match.when(
      (ua) => FIREFOX.test(ua),
      (ua) => `Firefox ${capture(FIREFOX, ua)}`
    ),
    Match.when(
      (ua) => SAFARI.test(ua),
      (ua) => `Safari ${capture(SAFARI, ua)}`
    ),
    Match.orElse(() => 'Unknown browser')
  );

/**
 * Names the operating system from its user agent.
 * @param userAgent Browser user agent.
 * @returns Operating system name, or a fallback label.
 */
const osName = (userAgent: string): string =>
  Match.value(userAgent).pipe(
    Match.when(
      (ua) => ua.includes('Windows'),
      () => 'Windows'
    ),
    Match.when(
      (ua) => ua.includes('Mac OS X'),
      () => 'macOS'
    ),
    Match.when(
      (ua) => ua.includes('Android'),
      () => 'Android'
    ),
    Match.when(
      (ua) => /(iPhone|iPad|iPod)/.test(ua),
      () => 'iOS'
    ),
    Match.when(
      (ua) => ua.includes('Linux'),
      () => 'Linux'
    ),
    Match.orElse(() => 'Unknown OS')
  );

/**
 * Extracts the first capture group of a pattern.
 * @param pattern Pattern to execute.
 * @param userAgent Text to search.
 * @returns The captured text, or an empty string.
 */
const capture = (pattern: RegExp, userAgent: string): string =>
  pattern.exec(userAgent)?.[1] ?? '';
