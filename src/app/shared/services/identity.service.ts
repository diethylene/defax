import { Injectable } from '@angular/core';
import type { Identity } from '../interfaces/identity';

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
  const edge = /Edg\/(\d+)/.exec(userAgent);
  if (edge) return `Edge ${edge[1]}`;
  const chrome = /Chrome\/(\d+)/.exec(userAgent);
  if (chrome) return `Chrome ${chrome[1]}`;
  const firefox = /Firefox\/(\d+)/.exec(userAgent);
  if (firefox) return `Firefox ${firefox[1]}`;
  const safari = /Version\/(\d+)/.exec(userAgent);
  if (safari) return `Safari ${safari[1]}`;
  return 'Unknown browser';
}

function osName(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Android')) return 'Android';
  if (/(iPhone|iPad|iPod)/.test(userAgent)) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}
