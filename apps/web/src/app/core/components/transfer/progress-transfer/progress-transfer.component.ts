import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import * as Match from 'effect/Match';
import { StatusLightComponent } from '../../../../shared/components/status-light/status-light.component';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import type { TransferMode, TransferRoute } from '../../../interfaces/transfer.interface';
import { TransferFileSummaryComponent } from '../transfer-file-summary/transfer-file-summary.component';

/** Progress values shown while a transfer runs. */
export interface ProgressTransfer {
  /** Name of the file being moved. */
  fileName: string;
  /** Browser of the peer. */
  peerBrowser: string;
  /** Operating system of the peer. */
  peerOs: string;
  /** Whole percentage of the file moved, capped below 100 until verified. */
  percent: number;
  /** Bytes moved so far. */
  sent: number;
  /** Total bytes in the file. */
  total: number;
  /** Current throughput in bytes per second. */
  speed: number;
  /** Estimated seconds left, or undefined while the speed is unknown. */
  timeLeft: number | undefined;
  /** Route the transfer takes. */
  route: TransferRoute;
  /** Whether the arrived file is being verified. */
  verifying: boolean;
}

/** Card with the progress, speed and route of a running transfer. */
@Component({
  selector: 'app-progress-transfer',
  imports: [
    HlmBadge,
    HlmCard,
    HlmCardContent,
    HlmProgressImports,
    StatusLightComponent,
    FileSizePipe,
    DurationPipe,
    TransferFileSummaryComponent,
  ],
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-transfer.component.html',
})
export class ProgressTransferComponent {
  /** Direction of the transfer. */
  readonly mode = input.required<TransferMode>();
  /** Progress to show. */
  readonly progress = input.required<ProgressTransfer>();

  /** Label for the bytes moved, per direction. */
  protected readonly sentLabel = computed(() =>
    Match.value(this.mode()).pipe(
      Match.when('send', () => 'Sent'),
      Match.when('receive', () => 'Received'),
      Match.exhaustive,
    ),
  );

  /** Line shown under the progress bar. */
  protected readonly statusLabel = computed(() =>
    this.progress().verifying
      ? 'Verifying...'
      : Match.value(this.mode()).pipe(
          Match.when('send', () => 'Transmitting...'),
          Match.when('receive', () => 'Receiving...'),
          Match.exhaustive,
        ),
  );

  /** Light variant and label for the route. */
  protected readonly route = computed(() =>
    Match.value(this.progress().route).pipe(
      Match.when('direct', () => ({ variant: 'positive', label: 'Direct' }) as const),
      Match.when('relay', () => ({ variant: 'warning', label: 'Relay' }) as const),
      Match.exhaustive,
    ),
  );
}
