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
import * as Match from 'effect/Match';
import { chunk } from '../../../../shared/utilities/chunk';
import type { TransferMode } from '../../../interfaces/transfer.interface';
import { PageShellComponent } from '../../page-shell/page-shell.component';
import { TransferFileSummaryComponent } from '../transfer-file-summary/transfer-file-summary.component';

const CHECKSUM_GROUP_SIZE = 4;

/** Heading, subheading and action label shown per transfer direction. */
const copyFor = Match.type<TransferMode>().pipe(
  Match.when('send', () => ({
    heading: 'Delivered',
    subheading: 'The receiver has the file and confirmed it arrived intact.',
    actionLabel: 'Send another file'
  })),
  Match.when('receive', () => ({
    heading: 'Received',
    subheading: 'The file is saved and confirmed intact.',
    actionLabel: 'Receive another file'
  })),
  Match.exhaustive
);

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
  templateUrl: './transfer-complete.component.html'
})
export class TransferCompleteComponent {
  readonly mode = input.required<TransferMode>();
  readonly fileName = input.required<string>();
  readonly fileSize = input.required<number>();
  readonly peerBrowser = input.required<string>();
  readonly peerOs = input.required<string>();
  readonly timeTaken = input<number | undefined>(undefined);
  readonly checksum = input<string | undefined>(undefined);
  readonly restart = output<void>();

  protected readonly copy = computed(() => copyFor(this.mode()));

  protected readonly checksumGroups = computed(() =>
    chunk(this.checksum() ?? '', CHECKSUM_GROUP_SIZE)
  );
}
