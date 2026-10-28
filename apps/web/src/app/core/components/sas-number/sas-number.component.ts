import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

/** Shows the short authentication string as two digit groups. */
@Component({
  selector: 'app-sas-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-center gap-2"
      role="group"
      [attr.aria-label]="sas()"
    >
      @for (group of groups(); track $index) {
        @if (!$first) {
          <span
            class="font-mono text-2xl font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            -
          </span>
        }
        <span class="flex gap-2">
          @for (digit of group; track $index) {
            <span
              class="flex size-12 items-center justify-center rounded-lg border border-input bg-muted/50 font-mono text-xl font-semibold text-foreground"
            >
              {{ digit }}
            </span>
          }
        </span>
      }
    </div>
  `
})
export class SasNumberComponent {
  /** Short authentication string both peers compare. */
  readonly sas = input.required<string>();

  /** Digits split into the two groups shown on screen. */
  protected readonly groups = computed(() => {
    const value = this.sas();
    const midpoint = Math.ceil(value.length / 2);
    return [
      value.slice(0, midpoint).split(''),
      value.slice(midpoint).split('')
    ];
  });
}
