import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { Injectable, InjectionToken, inject, type Provider } from '@angular/core';
import * as Match from 'effect/Match';

/** URL prefixes whose routes are collapsed to the prefix itself. */
export const MASKED_URL_PREFIXES = new InjectionToken<string[]>('MASKED_URL_PREFIXES');

/** Collapses configured route prefixes in the browser URL. */
@Injectable()
export class MaskingLocationStrategy extends PathLocationStrategy {
  /** Prefixes whose routes are collapsed. */
  private readonly prefixes = inject(MASKED_URL_PREFIXES);

  /**
   * Pushes state, collapsing the URL to a masked prefix when needed.
   * @param state Router state to store.
   * @param title Document title.
   * @param url Target URL.
   * @param queryParams Query string for the URL.
   */
  override pushState(state: unknown, title: string, url: string, queryParams: string): void {
    const masked = this.mask(url);
    Match.value(masked !== url && this.path() === masked).pipe(
      Match.when(true, () => super.replaceState(state, title, masked, queryParams)),
      Match.when(false, () => super.pushState(state, title, masked, queryParams)),
      Match.exhaustive,
    );
  }

  /**
   * Replaces state, collapsing the URL to a masked prefix when needed.
   * @param state Router state to store.
   * @param title Document title.
   * @param url Target URL.
   * @param queryParams Query string for the URL.
   */
  override replaceState(state: unknown, title: string, url: string, queryParams: string): void {
    super.replaceState(state, title, this.mask(url), queryParams);
  }

  /**
   * Collapses a URL to its configured prefix.
   * @param url URL to mask.
   * @returns The matching prefix, or the URL unchanged.
   */
  private mask(url: string): string {
    return this.prefixes.find((prefix) => url.startsWith(`${prefix}/`)) ?? url;
  }
}

/**
 * Provides the masking location strategy with its prefix list.
 * @param prefixes URL prefixes whose routes are collapsed.
 * @returns The router providers.
 */
export const provideMaskedUrls = (...prefixes: string[]): Provider[] => [
  { provide: LocationStrategy, useClass: MaskingLocationStrategy },
  { provide: MASKED_URL_PREFIXES, useValue: prefixes },
];
