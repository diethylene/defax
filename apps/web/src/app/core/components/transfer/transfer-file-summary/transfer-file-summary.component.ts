import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import * as Match from 'effect/Match';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import type { TransferMode } from '../../../interfaces/transfer.interface';

/** Summary of the file with the transfer direction and peer. */
@Component({
  selector: 'app-transfer-file-summary',
  imports: [NgIcon, FileSizePipe, DurationPipe],
  providers: [provideIcons({ lucideFile })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-4">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <ng-icon name="lucideFile" size="24" />
      </div>

      <div class="min-w-0 flex-1">
        <h2
          class="truncate text-base font-semibold tracking-tight text-foreground"
        >
          {{ name() }}
        </h2>
        <p class="truncate text-sm text-muted-foreground">
          @if (size(); as value) {
            <span>{{ value | fileSize }}</span>
            <span aria-hidden="true"> · </span>
          }
          <span>{{ directionLabel() }} {{ peerBrowser() }} on {{ peerOs() }}</span>
          @if (timeTaken(); as value) {
            <span aria-hidden="true"> · </span>
            <span>{{ value | duration }}</span>
          }
        </p>
      </div>

      <ng-content select="[trailing]" />
    </div>
  `,
})
export class TransferFileSummaryComponent {
  /** Direction of the transfer. */
  readonly mode = input.required<TransferMode>();
  /** Name of the file. */
  readonly name = input.required<string>();
  /** Size of the file in bytes, or undefined when unknown. */
  readonly size = input<number | undefined>(undefined);
  /** Browser of the peer. */
  readonly peerBrowser = input('');
  /** Operating system of the peer. */
  readonly peerOs = input('');
  /** Seconds the transfer took, or undefined when unknown. */
  readonly timeTaken = input<number | undefined>(undefined);

  /** Direction word shown before the peer. */
  protected readonly directionLabel = computed(() =>
    Match.value(this.mode()).pipe(
      Match.when('send', () => 'To'),
      Match.when('receive', () => 'From'),
      Match.exhaustive,
    ),
  );
}
