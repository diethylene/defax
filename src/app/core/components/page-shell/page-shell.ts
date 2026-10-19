import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';

export interface PageStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-page-shell',
  imports: [HlmBadge],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-shell.html'
})
export class PageShellComponent {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
  readonly steps = input<PageStep[]>([]);
}
