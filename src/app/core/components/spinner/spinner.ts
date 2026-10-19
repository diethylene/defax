import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSpinner } from '@spartan-ng/helm/spinner';

@Component({
  selector: 'app-spinner',
  imports: [HlmSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3">
      <hlm-spinner class="text-xl" />
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium text-foreground">{{ heading() }}</p>
        <p class="text-sm text-muted-foreground">{{ subheading() }}</p>
      </div>
    </div>
  `
})
export class SpinnerComponent {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
}
