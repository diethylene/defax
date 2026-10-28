import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';

/** One numbered step shown under the page content. */
export interface PageStep {
  /** Short step title. */
  title: string;
  /** One-line explanation. */
  description: string;
}

/** Fades the steps into and out of view. */
const stepsFade = trigger('stepsFade', [
  transition(':enter', [style({ opacity: 0 }), animate('200ms ease-out', style({ opacity: 1 }))]),
  transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))]),
]);

/** Centred page frame with a heading, content and optional steps. */
@Component({
  selector: 'app-page-shell',
  imports: [HlmBadge],
  host: { class: 'block' },
  animations: [stepsFade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-shell.component.html',
})
export class PageShellComponent {
  /** Page heading. */
  readonly heading = input.required<string>();
  /** Supporting line under the heading. */
  readonly subheading = input.required<string>();
  /** Steps shown below the content. */
  readonly steps = input<PageStep[]>([]);
  /** Whether the steps are allowed to show. */
  readonly stepsVisible = input(true);

  /** Whether there are steps to show. */
  protected readonly showSteps = computed(() => this.stepsVisible() && this.steps().length > 0);
}
