import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { map } from 'rxjs';
import { receiveDisconnect } from '../../../../store/actions/receive.actions';
import {
  selectReceiveFile,
  selectReceivePeerIdentity,
  selectReceivePhase,
  selectReceiveTransfer
} from '../../../../store/selectors/receive.selectors';
import { PageShellComponent } from '../../page-shell/page-shell';
import { ProgressTransferComponent } from '../progress-transfer/progress-transfer';
import { TransferComponent } from '../transfer.abstract';
import { TransferMetricsStore } from '../transfer-metrics.store';

@Component({
  selector: 'app-receiver-transfer',
  imports: [PageShellComponent, ProgressTransferComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receiver-transfer.html'
})
export class ReceiverTransferComponent extends TransferComponent {
  constructor() {
    const store = inject(Store);
    super(
      store.select(selectReceiveTransfer).pipe(
        map((transfer) => ({
          transferred: transfer.received,
          total: transfer.total,
          route: transfer.route,
          verified: transfer.verified
        }))
      ),
      store.select(selectReceiveFile),
      store.select(selectReceivePeerIdentity),
      store
        .select(selectReceivePhase)
        .pipe(map((phase) => phase === 'verifying'))
    );
  }

  protected cancel(): void {
    this.store.dispatch(receiveDisconnect());
  }
}
