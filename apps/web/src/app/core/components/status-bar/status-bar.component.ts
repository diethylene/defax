import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHelpCircle, lucideLock } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { selectStatus } from '@web/store/connectivity/connectivity.selectors';
import { StatusPillComponent } from './status-pill.component';
import { statusStates } from './status-states.mapping';

/** Footer bar with the connection status and the relay help link. */
@Component({
  selector: 'app-status-bar',
  imports: [RouterLink, NgIcon, StatusPillComponent, HlmButton],
  providers: [provideIcons({ lucideHelpCircle, lucideLock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-bar.component.html',
})
export class StatusBarComponent {
  /** Global store the connectivity status is read from. */
  private readonly store = inject(Store);
  /** Current connectivity status. */
  protected readonly status = this.store.selectSignal(selectStatus);
  /** Copy and dot colour for the current status. */
  protected readonly state = computed(() => statusStates[this.status()._tag]);
}
