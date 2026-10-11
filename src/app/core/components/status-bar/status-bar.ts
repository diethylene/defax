import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHelpCircle, lucideLock } from '@ng-icons/lucide';
import { signalState } from '@ngrx/signals';
import type { StatusLightVariant } from '../../../shared/components/status-light/status-light';
import { StatusPill } from './status-pill';
import { statusStates } from './status-state';

@Component({
  selector: 'app-status-bar',
  imports: [RouterLink, NgIcon, StatusPill],
  providers: [provideIcons({ lucideHelpCircle, lucideLock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-bar.html'
})
export class StatusBar {
  private readonly state = signalState({
    status: 'positive' as StatusLightVariant
  });

  protected readonly status = this.state.status;

  protected readonly description = computed(
    () => statusStates[this.status()].description
  );
}
