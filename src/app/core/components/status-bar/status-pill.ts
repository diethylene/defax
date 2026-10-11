import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  StatusLightComponent,
  type StatusLightVariant
} from '../../../shared/components/status-light/status-light';

@Component({
  selector: 'app-status-pill',
  imports: [StatusLightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex h-6 items-center rounded-md border border-border bg-background px-2.5"
    >
      <app-status-light [variant]="status()" size="sm">{{
        label()
      }}</app-status-light>
    </span>
  `
})
export class StatusPill {
  readonly status = input.required<StatusLightVariant>();
  readonly label = input.required<string>();
}
