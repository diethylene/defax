import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import {
  StatusLightComponent,
  type StatusLightVariant
} from '../../../shared/components/status-light/status-light';
import { statusStates } from './status-state';

@Component({
  selector: 'app-status-pill',
  imports: [StatusLightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex h-6 items-center rounded-md border border-border bg-background px-2.5"
    >
      <app-status-light [variant]="status()" size="sm">
        <span class="hidden sm:inline">{{ state().label }}</span>
        <span class="sm:hidden">{{ state().labelMobile }}</span>
      </app-status-light>
    </span>
  `
})
export class StatusPill {
  readonly status = input.required<StatusLightVariant>();

  protected readonly state = computed(() => statusStates[this.status()]);
}
