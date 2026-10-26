import { Component, computed, input } from '@angular/core';

/** Visual tone of a badge. */
export type BadgeTone = 'neutral' | 'positive' | 'negative';

/** Tailwind classes per tone. */
const toneClasses = {
  neutral: 'bg-muted text-muted-foreground',
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-destructive/10 text-destructive',
} satisfies Record<BadgeTone, string>;

/** A small rounded label with a tone. */
@Component({
  selector: 'app-status-badge',
  template: `<span class="rounded-full px-2 py-0.5 text-xs font-medium" [class]="classes()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  /** Text shown in the badge. */
  readonly label = input.required<string>();
  /** Visual tone. */
  readonly tone = input<BadgeTone>('neutral');
  /** Classes for the current tone. */
  protected readonly classes = computed(() => toneClasses[this.tone()]);
}
