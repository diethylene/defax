import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSpinner } from '@spartan-ng/helm/spinner';

/** Spinner with a heading and a subheading for work in progress. */
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
  /** Main line of text. */
  readonly heading = input.required<string>();
  /** Supporting line of text. */
  readonly subheading = input.required<string>();
}
