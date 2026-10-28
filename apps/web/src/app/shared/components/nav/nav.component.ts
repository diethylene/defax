import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type { NavItem } from './nav-item.model';

/** Base classes shared by every nav link. */
const itemBase =
  'rounded-sm px-1.5 py-[2px] text-sm font-medium flex items-center gap-1.5 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50';

/** Horizontal navigation bar built from a list of router links. */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.component.html'
})
export class NavComponent {
  /** Links rendered by the bar. */
  readonly items = input.required<NavItem[]>();
  /** Current router URL used to mark the active link. */
  readonly activeRoute = input('');
  /** Accessible label for the nav landmark. */
  readonly ariaLabel = input('Navigation');

  /** Classes for the nav container. */
  protected readonly containerClasses =
    'bg-background h-8 gap-0.5 rounded-lg border p-[3px] flex items-center';

  /**
   * Combines base and active classes for one link.
   * @param item Link being rendered.
   * @returns Class list for the link.
   */
  protected itemClasses(item: NavItem): string {
    const state = this.isActive(item) ? 'bg-muted' : 'hover:bg-muted';
    return `${itemBase} ${state}`;
  }

  /**
   * Tells whether a link matches the current route.
   * @param item Link being checked.
   * @returns True when the link is the current page.
   */
  protected isActive(item: NavItem): boolean {
    const current = this.path(this.activeRoute());
    if (!current) return false;
    const exact = item.exact ?? true;
    return exact
      ? current === item.route
      : current === item.route || current.startsWith(`${item.route}/`);
  }

  /**
   * Normalizes a router URL to a comparable path.
   * @param url URL to normalize.
   * @returns Path without query, fragment, or trailing slash.
   */
  private path(url: string): string {
    const pathname = url.split(/[?#]/)[0];
    const stripped = pathname.replace(/\/+$/, '');
    return stripped || '/';
  }
}
