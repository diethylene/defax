import { Injectable } from '@angular/core';
import { match } from 'ts-pattern';
import type { Identity } from '@contract/signal/identity.model';

const EDGE = /Edg\/(\d+)/;
const CHROME = /Chrome\/(\d+)/;
const FIREFOX = /Firefox\/(\d+)/;
const SAFARI = /Version\/(\d+)/;

@Injectable({ providedIn: 'root' })
export class IdentityService {
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

function browserName(userAgent: string): string {
  return match(userAgent)
    .when(
      (ua) => EDGE.test(ua),
      (ua) => `Edge ${capture(EDGE, ua)}`
    )
    .when(
      (ua) => CHROME.test(ua),
      (ua) => `Chrome ${capture(CHROME, ua)}`
    )
    .when(
      (ua) => FIREFOX.test(ua),
      (ua) => `Firefox ${capture(FIREFOX, ua)}`
    )
    .when(
      (ua) => SAFARI.test(ua),
      (ua) => `Safari ${capture(SAFARI, ua)}`
    )
    .otherwise(() => 'Unknown browser');
}

function osName(userAgent: string): string {
  return match(userAgent)
    .when(
      (ua) => ua.includes('Windows'),
      () => 'Windows'
    )
    .when(
      (ua) => ua.includes('Mac OS X'),
      () => 'macOS'
    )
    .when(
      (ua) => ua.includes('Android'),
      () => 'Android'
    )
    .when(
      (ua) => /(iPhone|iPad|iPod)/.test(ua),
      () => 'iOS'
    )
    .when(
      (ua) => ua.includes('Linux'),
      () => 'Linux'
    )
    .otherwise(() => 'Unknown OS');
}

function capture(pattern: RegExp, userAgent: string): string {
  return pattern.exec(userAgent)?.[1] ?? '';
}
