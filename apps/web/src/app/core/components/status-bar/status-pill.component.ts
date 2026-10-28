import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { StatusLightComponent } from '../../../shared/components/status-light/status-light';
import { type StatusBarStatus, statusStates } from './status-state.model';

@Component({
  selector: 'app-status-pill',
  imports: [StatusLightComponent, HlmBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span hlmBadge variant="outline" class="h-6 rounded-md bg-background px-2.5 py-0">
      <app-status-light [variant]="status()" size="sm">
        <span class="hidden sm:inline">{{ state().label }}</span>
        <span class="sm:hidden">{{ state().labelMobile }}</span>
      </app-status-light>
    </span>
  `
})
export class StatusPillComponent {
  readonly status = input.required<StatusBarStatus>();

  protected readonly state = computed(() => statusStates[this.status()]);
}
