import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { match } from 'ts-pattern';
import { StatusLightComponent } from '../../../../shared/components/status-light/status-light';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import type {
  TransferMode,
  TransferRoute
} from '../../../interfaces/transfer.interface';
import { TransferFileSummaryComponent } from '../transfer-file-summary/transfer-file-summary';

export interface ProgressTransfer {
  fileName: string;
  peerBrowser: string;
  peerOs: string;
  percent: number;
  sent: number;
  total: number;
  speed: number;
  timeLeft: number | null;
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
  templateUrl: './progress-transfer.html'
})
export class ProgressTransferComponent {
  readonly mode = input.required<TransferMode>();
  readonly progress = input.required<ProgressTransfer>();

  protected readonly sentLabel = computed(() =>
    match(this.mode())
      .with('send', () => 'Sent')
      .with('receive', () => 'Received')
      .exhaustive()
  );

  protected readonly statusLabel = computed(() => {
    if (this.progress().verifying) return 'Verifying...';
    return match(this.mode())
      .with('send', () => 'Transmitting...')
      .with('receive', () => 'Receiving...')
      .exhaustive();
  });

  protected readonly route = computed(() =>
    match(this.progress().route)
      .with('direct', () => ({ variant: 'positive', label: 'Direct' }) as const)
      .with('relay', () => ({ variant: 'warning', label: 'Relay' }) as const)
      .exhaustive()
  );
}
