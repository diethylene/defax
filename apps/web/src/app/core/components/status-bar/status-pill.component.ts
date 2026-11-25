import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { StatusLightComponent } from '../../../shared/components/status-light/status-light.component';
import type { StatusState } from './status-state.interface';

/** Badge that shows one connection status with a coloured light. */
@Component({
  selector: 'app-status-pill',
  imports: [StatusLightComponent, HlmBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span hlmBadge variant="outline" class="h-6 rounded-md bg-background px-2.5 py-0">
      <app-status-light [variant]="state().variant" size="sm">
        <span class="hidden sm:inline">{{ state().label }}</span>
        <span class="sm:hidden">{{ state().labelMobile }}</span>
      </app-status-light>
    </span>
  `,
})
export class StatusPillComponent {
  /** Copy and dot colour to present. */
  readonly state = input.required<StatusState>();
}
