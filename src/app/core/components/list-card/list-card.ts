import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmCard, HlmCardTitle } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-list-card',
  imports: [HlmCard, HlmCardTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCard class="p-4">
      <h3 hlmCardTitle>{{ title() }}</h3>
      <ul class="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        @for (item of items(); track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </div>
  `
})
export class ListCard {
  readonly title = input.required<string>();
  readonly items = input.required<string[]>();
}
