import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHelpCircle, lucideLock } from '@ng-icons/lucide';
import type { StatusLightVariant } from '../../../shared/components/status-light/status-light';
import { StatusPill } from './status-pill';

@Component({
  selector: 'app-status-bar',
  imports: [RouterLink, NgIcon, StatusPill],
  providers: [provideIcons({ lucideHelpCircle, lucideLock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-bar.html'
})
export class StatusBar {
  readonly status = input.required<StatusLightVariant>();
  readonly label = input.required<string>();
  readonly description = input('');
}
