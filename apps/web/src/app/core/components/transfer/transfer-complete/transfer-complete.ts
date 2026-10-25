import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { match } from 'ts-pattern';
import { chunk } from '../../../../shared/utilities/chunk';
import type { TransferMode } from '../../../interfaces/transfer.interface';
import { PageShellComponent } from '../../page-shell/page-shell';
import { TransferFileSummaryComponent } from '../transfer-file-summary/transfer-file-summary';

const CHECKSUM_GROUP_SIZE = 4;

@Component({
  selector: 'app-transfer-complete',
  imports: [
    NgIcon,
    PageShellComponent,
    TransferFileSummaryComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmSeparator
  ],
  providers: [provideIcons({ lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-complete.html'
})
export class TransferCompleteComponent {
  readonly mode = input.required<TransferMode>();
  readonly fileName = input.required<string>();
  readonly fileSize = input.required<number>();
  readonly peerBrowser = input.required<string>();
  readonly peerOs = input.required<string>();
  readonly timeTaken = input<number | null>(null);
  readonly checksum = input<string | null>(null);
  readonly restart = output<void>();

  protected readonly heading = computed(() =>
    match(this.mode())
      .with('send', () => 'Delivered')
      .with('receive', () => 'Received')
      .exhaustive()
  );

  protected readonly subheading = computed(() =>
    match(this.mode())
      .with(
        'send',
        () => 'The receiver has the file and confirmed it arrived intact.'
      )
      .with('receive', () => 'The file is saved and confirmed intact.')
      .exhaustive()
  );

  protected readonly actionLabel = computed(() =>
    match(this.mode())
      .with('send', () => 'Send another file')
      .with('receive', () => 'Receive another file')
      .exhaustive()
  );

  protected readonly checksumGroups = computed(() =>
    chunk(this.checksum() ?? '', CHECKSUM_GROUP_SIZE)
  );
}
