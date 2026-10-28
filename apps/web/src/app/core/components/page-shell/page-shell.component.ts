import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';

export interface PageStep {
  title: string;
  description: string;
}

const stepsFade = trigger('stepsFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))])
]);

@Component({
  selector: 'app-page-shell',
  imports: [HlmBadge],
  host: { class: 'block' },
  animations: [stepsFade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-shell.component.html'
})
export class PageShellComponent {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
  readonly steps = input<PageStep[]>([]);
  readonly stepsVisible = input(true);
}
