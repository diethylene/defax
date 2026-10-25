import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type { NavItem } from './nav-item';

const itemBase =
  'rounded-sm px-1.5 py-[2px] text-sm font-medium flex items-center gap-1.5 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.html'
})
export class NavComponent {
  readonly items = input.required<NavItem[]>();
  readonly activeRoute = input('');
  readonly ariaLabel = input('Navigation');

  protected readonly containerClasses =
    'bg-background h-8 gap-0.5 rounded-lg border p-[3px] flex items-center';

  protected itemClasses(item: NavItem): string {
    const state = this.isActive(item) ? 'bg-muted' : 'hover:bg-muted';
    return `${itemBase} ${state}`;
  }

  protected isActive(item: NavItem): boolean {
    const current = this.path(this.activeRoute());
    if (!current) return false;
    const exact = item.exact ?? true;
    return exact
      ? current === item.route
      : current === item.route || current.startsWith(`${item.route}/`);
  }

  private path(url: string): string {
    const pathname = url.split(/[?#]/)[0];
    const stripped = pathname.replace(/\/+$/, '');
    return stripped || '/';
  }
}
