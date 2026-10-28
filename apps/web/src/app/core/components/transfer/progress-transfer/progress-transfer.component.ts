import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import * as Match from 'effect/Match';
import { StatusLightComponent } from '../../../../shared/components/status-light/status-light';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import type {
  TransferMode,
  TransferRoute
} from '../../../interfaces/transfer.interface';
import { TransferFileSummaryComponent } from '../transfer-file-summary/transfer-file-summary.component';

export interface ProgressTransfer {
  fileName: string;
  peerBrowser: string;
  peerOs: string;
  percent: number;
  sent: number;
  total: number;
  speed: number;
  timeLeft: number | undefined;
  route: TransferRoute;
  verifying: boolean;
}

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
    TransferFileSummaryComponent
  ],
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-transfer.component.html'
})
export class ProgressTransferComponent {
  readonly mode = input.required<TransferMode>();
  readonly progress = input.required<ProgressTransfer>();

  protected readonly sentLabel = computed(() =>
    Match.value(this.mode()).pipe(
      Match.when('send', () => 'Sent'),
      Match.when('receive', () => 'Received'),
      Match.exhaustive
    )
  );

  protected readonly statusLabel = computed(() =>
    this.progress().verifying
      ? 'Verifying...'
      : Match.value(this.mode()).pipe(
          Match.when('send', () => 'Transmitting...'),
          Match.when('receive', () => 'Receiving...'),
          Match.exhaustive
        )
  );

  protected readonly route = computed(() =>
    Match.value(this.progress().route).pipe(
      Match.when('direct', () => ({ variant: 'positive', label: 'Direct' }) as const),
      Match.when('relay', () => ({ variant: 'warning', label: 'Relay' }) as const),
      Match.exhaustive
    )
  );
}
