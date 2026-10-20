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
import { StatusLightComponent } from '../../../shared/components/status-light/status-light';

export type TransferMode = 'send' | 'receive';
export type TransferRoute = 'direct' | 'relay';

export interface TransferProgress {
  fileName: string;
  peerBrowser: string;
  peerOs: string;
  percent: number;
  sent: string;
  speed: string;
  timeLeft: string;
  route: TransferRoute;
}

@Component({
  selector: 'app-transfer-progress',
  imports: [
    NgIcon,
    HlmBadge,
    HlmCard,
    HlmCardContent,
    HlmProgressImports,
    StatusLightComponent
  ],
  providers: [provideIcons({ lucideFile })],
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-progress.html'
})
export class TransferProgressComponent {
  readonly mode = input.required<TransferMode>();
  readonly progress = input.required<TransferProgress>();

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
