import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { map } from 'rxjs';
import {
  selectSendHashProgress,
  selectSendMetadata
} from '../../../store/selectors/send.selectors';

@Component({
  selector: 'app-hash-progress-toast',
  imports: [HlmProgressImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block w-full rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-md'
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
  `
})
export class HashProgressToastComponent {
  private readonly store = inject(Store);

  private readonly processed = toSignal(
    this.store.select(selectSendHashProgress),
    { initialValue: 0 }
  );

  private readonly total = toSignal(
    this.store.select(selectSendMetadata).pipe(map((m) => m?.size ?? 0)),
    { initialValue: 0 }
  );

  protected readonly percent = computed(() =>
    this.total() > 0 ? Math.round((this.processed() / this.total()) * 100) : 0
  );
}
