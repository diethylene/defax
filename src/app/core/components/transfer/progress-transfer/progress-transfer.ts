import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { match } from 'ts-pattern';
import { StatusLightComponent } from '../../../../shared/components/status-light/status-light';
import type { TransferRoute } from '../../../../shared/interfaces/transfer';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';

export type TransferMode = 'send' | 'receive';

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
}

@Component({
  selector: 'app-progress-transfer',
  imports: [
    NgIcon,
    HlmBadge,
    HlmCard,
    HlmCardContent,
    HlmProgressImports,
    StatusLightComponent,
    FileSizePipe,
    DurationPipe
  ],
  providers: [provideIcons({ lucideFile })],
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

  protected readonly route = computed(() =>
    match(this.progress().route)
      .with('direct', () => ({ variant: 'positive', label: 'Direct' }) as const)
      .with('relay', () => ({ variant: 'warning', label: 'Relay' }) as const)
      .exhaustive()
  );
}
