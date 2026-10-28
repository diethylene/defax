import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import * as Match from 'effect/Match';
import { hashOf, metadataOf, selectSendStatus } from '../../../store/send/send.selectors';

/** Shows how far the file hash has progressed. */
@Component({
  selector: 'app-hash-progress-toast',
  imports: [HlmProgressImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block w-[var(--width)] max-w-full rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-md',
  },
  template: `
    <div class="mb-2 flex items-center justify-between gap-3">
      <span class="text-sm font-medium">Calculating SHA-256 checksum</span>
      <span class="text-sm tabular-nums text-muted-foreground">
        {{ percent() }}%
      </span>
    </div>
    <hlm-progress [value]="percent()">
      <hlm-progress-indicator />
    </hlm-progress>
  `,
})
export class HashProgressToastComponent {
  /** Global store. */
  private readonly store = inject(Store);
  /** The latest send status. */
  private readonly status = this.store.selectSignal(selectSendStatus);

  /** Bytes hashed so far. */
  private readonly processed = computed(() =>
    Match.value(hashOf(this.status())).pipe(
      Match.tag('Hashing', ({ progress }) => progress),
      Match.orElse(() => 0),
    ),
  );

  /** Size of the file being hashed, or zero when unknown. */
  private readonly total = computed(() => metadataOf(this.status())?.size ?? 0);

  /** Share of the file hashed, as a whole percentage. */
  protected readonly percent = computed(() =>
    this.total() > 0 ? Math.round((this.processed() / this.total()) * 100) : 0,
  );
}
