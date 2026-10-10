import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type { NavItem } from './nav-item';
import { type NavSize, navSizes } from './nav-size';

const containerBase =
  'inline-flex items-center gap-1 rounded-2xl border border-border bg-background shadow-sm';
const itemBase =
  'inline-flex items-center text-sm font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.html'
})
export class NavComponent {
  readonly items = input.required<NavItem[]>();
  readonly activeRoute = input('');
  readonly size = input<NavSize>('default');
  readonly ariaLabel = input('Navigation');

  protected readonly containerClasses = computed(
    () => `${containerBase} ${navSizes[this.size()].container}`
  );
  protected readonly sizeClasses = computed(() => navSizes[this.size()]);

  protected itemClasses(item: NavItem): string {
    const state = this.isActive(item)
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground';
    return `${itemBase} ${this.sizeClasses().item} ${state}`;
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
