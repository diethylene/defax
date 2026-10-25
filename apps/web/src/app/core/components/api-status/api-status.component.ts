import { Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import type { BadgeTone } from '@web/shared/components/status-badge/status-badge.component';
import { StatusBadgeComponent } from '@web/shared/components/status-badge/status-badge.component';
import { HealthActions } from '@web/store/health/health.actions';
import { type HealthCheck, healthFeature } from '@web/store/health/health.reducer';

/** Badge label and tone per check state. */
const presentation = {
  Unchecked: { label: 'Not checked', tone: 'neutral' },
  Checking: { label: 'Checking', tone: 'neutral' },
  Healthy: { label: 'API ok', tone: 'positive' },
  Unreachable: { label: 'API unreachable', tone: 'negative' },
} satisfies Record<HealthCheck['_tag'], { readonly label: string; readonly tone: BadgeTone }>;

/** Shows API health from the store and lets the user recheck it. */
@Component({
  selector: 'app-api-status',
  imports: [HlmButton, StatusBadgeComponent],
  template: `
    <app-status-badge [label]="view().label" [tone]="view().tone" />
    <button hlmBtn type="button" variant="ghost" size="sm" (click)="recheck()">Recheck</button>
  `,
})
export class ApiStatusComponent {
  /** Global store. */
  private readonly store = inject(Store);
  /** The latest check. */
  private readonly check = this.store.selectSignal(healthFeature.selectCheck);
  /** Badge label and tone for the latest check. */
  protected readonly view = computed(() => presentation[this.check()._tag]);

  /** Requests the first check when the component starts. */
  constructor() {
    this.store.dispatch(HealthActions.checkRequested());
  }

  /** Requests a new health check. */
  protected recheck(): void {
    this.store.dispatch(HealthActions.checkRequested());
  }
}
