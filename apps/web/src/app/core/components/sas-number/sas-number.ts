import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

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
  readonly sas = input.required<string>();

  protected readonly groups = computed(() => {
    const value = this.sas();
    const midpoint = Math.ceil(value.length / 2);
    return [
      value.slice(0, midpoint).split(''),
      value.slice(midpoint).split('')
    ];
  });
}
