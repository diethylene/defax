import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import {
  HlmCard,
  HlmCardDescription,
  HlmCardTitle
} from '@spartan-ng/helm/card';

@Component({
  selector: 'app-how-it-works-card',
  imports: [HlmBadge, HlmCard, HlmCardTitle, HlmCardDescription],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCard class="h-full p-4">
      <span
        hlmBadge
        variant="outline"
        class="size-6 justify-center rounded-full p-0 text-muted-foreground"
      >
        {{ step() }}
      </span>
      <h3 hlmCardTitle>{{ title() }}</h3>
      <p hlmCardDescription>
        <ng-content />
      </p>
    </div>
  `
})
export class HowItWorksCard {
  readonly step = input.required<number>();
  readonly title = input.required<string>();
}
