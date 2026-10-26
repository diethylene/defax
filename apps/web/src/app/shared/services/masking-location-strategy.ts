import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import {
  Injectable,
  InjectionToken,
  inject,
  type Provider
} from '@angular/core';
import { match } from 'ts-pattern';

export const MASKED_URL_PREFIXES = new InjectionToken<string[]>(
  'MASKED_URL_PREFIXES'
);

@Injectable()
export class MaskingLocationStrategy extends PathLocationStrategy {
  private readonly prefixes = inject(MASKED_URL_PREFIXES);

  override pushState(
    state: unknown,
    title: string,
    url: string,
    queryParams: string
  ): void {
    const masked = this.mask(url);
    match(masked !== url && this.path() === masked)
      .with(true, () => super.replaceState(state, title, masked, queryParams))
      .with(false, () => super.pushState(state, title, masked, queryParams))
      .exhaustive();
  }

  override replaceState(
    state: unknown,
    title: string,
    url: string,
    queryParams: string
  ): void {
    super.replaceState(state, title, this.mask(url), queryParams);
  }

  private mask(url: string): string {
    return this.prefixes.find((prefix) => url.startsWith(`${prefix}/`)) ?? url;
  }
}

export function provideMaskedUrls(...prefixes: string[]): Provider[] {
  return [
    { provide: LocationStrategy, useClass: MaskingLocationStrategy },
    { provide: MASKED_URL_PREFIXES, useValue: prefixes }
  ];
}
