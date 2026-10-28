import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideDownload,
  lucideHelpCircle,
  lucideUpload
} from '@ng-icons/lucide';
import { getRouterSelectors } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { NavComponent } from '../../../shared/components/nav/nav';
import type { NavItem } from '../../../shared/components/nav/nav-item';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

const { selectUrl } = getRouterSelectors();

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, NgIcon, NavComponent, ThemeToggleComponent],
  providers: [
    provideIcons({
      lucideArrowLeftRight,
      lucideUpload,
      lucideDownload,
      lucideHelpCircle
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  private readonly store = inject(Store);

  protected readonly activeRoute = toSignal(
    this.store.select(selectUrl).pipe(map((url) => url ?? '')),
    { initialValue: '' }
  );

  protected readonly primaryItems: NavItem[] = [
    { label: 'Send', route: '/send', icon: 'lucideUpload' },
    { label: 'Receive', route: '/receive', icon: 'lucideDownload' }
  ];

  protected readonly secondaryItems: NavItem[] = [
    {
      label: 'How it works',
      route: '/help',
      icon: 'lucideHelpCircle',
      hideLabelOnMobile: true
    }
  ];
}
