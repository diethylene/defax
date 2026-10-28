import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { map } from 'rxjs';
import type { TransferSnapshot } from '../../../interfaces/transfer.interface';
import { SendActions } from '../../../../store/send/send.actions';
import type { SendStatus } from '../../../../store/send/send-transitions';
import {
  isVerifying,
  metadataOf,
  peerIdentityOf,
  selectSendStatus,
  transferProgressOf
} from '../../../../store/send/send.selectors';
import { PageShellComponent } from '../../page-shell/page-shell';
import { ProgressTransferComponent } from '../progress-transfer/progress-transfer';
import { TransferComponent } from '../transfer.abstract';
import { TransferMetricsStore } from '../transfer-metrics.store';

const EMPTY_TRANSFER: TransferSnapshot = {
  transferred: 0,
  total: 0,
  route: null,
  verified: false
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
    verified: status._tag === 'Done'
  };
};

@Component({
  selector: 'app-sender-transfer',
  imports: [PageShellComponent, ProgressTransferComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sender-transfer.html'
})
export class SenderTransferComponent extends TransferComponent {
  constructor() {
    const store = inject(Store);
    const status$ = store.select(selectSendStatus);
    super(
      status$.pipe(map(snapshotOf)),
      status$.pipe(map(metadataOf)),
      status$.pipe(map(peerIdentityOf)),
      status$.pipe(map(isVerifying))
    );
  }

  protected cancel(): void {
    this.store.dispatch(SendActions.disconnect());
  }
}
