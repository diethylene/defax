import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { map } from 'rxjs';
import { SendActions } from '../../../../store/send/send.actions';
import {
  isVerifying,
  metadataOf,
  peerIdentityOf,
  selectSendStatus,
  transferProgressOf,
} from '../../../../store/send/send.selectors';
import type { SendStatus } from '../../../../store/send/send-transitions';
import type { TransferSnapshot } from '../../../interfaces/transfer.interface';
import { PageShellComponent } from '../../page-shell/page-shell.component';
import { ProgressTransferComponent } from '../progress-transfer/progress-transfer.component';
import { TransferComponent } from '../transfer.component';
import { TransferMetricsStore } from '../transfer-metrics.store';

/** Snapshot shown before the send reports progress. */
const EMPTY_TRANSFER: TransferSnapshot = {
  transferred: 0,
  total: 0,
  route: undefined,
  verified: false,
};

/**
 * Reads the bytes moved by the current transfer.
 * @param status Current send status.
 * @returns The transfer snapshot, empty before the transfer starts.
 */
const snapshotOf = (status: SendStatus): TransferSnapshot => {
  const progress = transferProgressOf(status);
  if (!progress) return EMPTY_TRANSFER;
  return {
    transferred: progress.sent,
    total: progress.total,
    route: 'direct',
    verified: status._tag === 'Done',
  };
};

/** Transfer screen shown to the sender. */
@Component({
  selector: 'app-sender-transfer',
  imports: [PageShellComponent, ProgressTransferComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sender-transfer.component.html',
})
export class SenderTransferComponent extends TransferComponent {
  /** Follows the send status to build the progress view. */
  constructor() {
    const store = inject(Store);
    const status$ = store.select(selectSendStatus);
    super(
      status$.pipe(map(snapshotOf)),
      status$.pipe(map(metadataOf)),
      status$.pipe(map(peerIdentityOf)),
      status$.pipe(map(isVerifying)),
    );
  }

  /** Stops sending and leaves the room. */
  protected cancel(): void {
    this.store.dispatch(SendActions.disconnect());
  }
}
