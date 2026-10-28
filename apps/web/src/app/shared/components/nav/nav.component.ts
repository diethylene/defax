import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type { NavItem } from './nav-item.model';

/** Base classes shared by every nav link. */
const itemBase =
  'rounded-sm px-1.5 py-[2px] text-sm font-medium flex items-center gap-1.5 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50';

/** A nav link with its computed presentation. */
interface NavViewItem extends NavItem {
  /** Classes for the link. */
  readonly classes: string;
  /** Whether the link matches the current route. */
  readonly active: boolean;
}

/** Horizontal navigation bar built from a list of router links. */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.component.html',
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

  /** Links with their computed classes and active state. */
  protected readonly view = computed<NavViewItem[]>(() => {
    const current = this.path(this.activeRoute());
    return this.items().map((item) => {
      const exact = item.exact ?? true;
      const active = exact
        ? current === item.route
        : current === item.route || current.startsWith(`${item.route}/`);
      return {
        ...item,
        classes: `${itemBase} ${active ? 'bg-muted' : 'hover:bg-muted'}`,
        active,
      };
    });
  });

  /**
   * Normalizes a router URL to a comparable path.
   * @param url URL to normalize.
   * @returns Path without query, fragment, or trailing slash.
   */
  private path(url: string): string {
    const pathname = url.replace(/[?#][\s\S]*$/, '');
    const stripped = pathname.replace(/\/+$/, '');
    return stripped || '/';
  }
}
