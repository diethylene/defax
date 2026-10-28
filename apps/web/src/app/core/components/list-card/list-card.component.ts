import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmCard, HlmCardTitle } from '@spartan-ng/helm/card';

/** Card listing short labelled points. */
@Component({
  selector: 'app-list-card',
  imports: [HlmCard, HlmCardTitle],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCard class="h-full p-4">
      <h3 hlmCardTitle>{{ title() }}</h3>
      <ul class="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        @for (item of items(); track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </div>
  `,
})
export class ListCardComponent {
  /** Card title. */
  readonly title = input.required<string>();
  /** Points shown in the list. */
  readonly items = input.required<string[]>();
}
