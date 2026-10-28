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

/** Digits shown per checksum group. */
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

/** Completion screen with the file summary and matched checksum. */
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
  /** Direction of the finished transfer. */
  readonly mode = input.required<TransferMode>();
  /** Name of the file that arrived. */
  readonly fileName = input.required<string>();
  /** Size of the file in bytes. */
  readonly fileSize = input.required<number>();
  /** Browser of the peer. */
  readonly peerBrowser = input.required<string>();
  /** Operating system of the peer. */
  readonly peerOs = input.required<string>();
  /** Seconds the transfer took, or undefined when unknown. */
  readonly timeTaken = input<number | undefined>(undefined);
  /** Checksum both peers confirmed, or undefined when unknown. */
  readonly checksum = input<string | undefined>(undefined);
  /** Emits when the user starts another transfer. */
  readonly restart = output<void>();

  /** Copy for the current direction. */
  protected readonly copy = computed(() => copyFor(this.mode()));

  /** Checksum split into readable groups. */
  protected readonly checksumGroups = computed(() =>
    chunk(this.checksum() ?? '', CHECKSUM_GROUP_SIZE)
  );
}
