import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHelpCircle, lucideLock } from '@ng-icons/lucide';
import { signalState } from '@ngrx/signals';
import { HlmButton } from '@spartan-ng/helm/button';
import { StatusPillComponent } from './status-pill.component';
import { type StatusBarStatus, statusStates } from './status-state.model';

/** Footer bar with the connection status and the relay help link. */
@Component({
  selector: 'app-status-bar',
  imports: [RouterLink, NgIcon, StatusPillComponent, HlmButton],
  providers: [provideIcons({ lucideHelpCircle, lucideLock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-bar.component.html'
})
export class StatusBarComponent {
  /** Current connection status. */
  private readonly state = signalState<{ status: StatusBarStatus }>({
    status: 'positive'
  });

  /** Connection status shown in the pill. */
  protected readonly status = this.state.status;

  /** One-line explanation of the current status. */
  protected readonly description = computed(
    () => statusStates[this.status()].description
  );
}
