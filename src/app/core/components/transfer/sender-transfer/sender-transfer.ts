import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { map } from 'rxjs';
import { sendDisconnect } from '../../../../store/actions/send.actions';
import {
  selectSendMetadata,
  selectSendPeerIdentity,
  selectSendTransfer
} from '../../../../store/selectors/send.selectors';
import { PageShellComponent } from '../../page-shell/page-shell';
import { ProgressTransferComponent } from '../progress-transfer/progress-transfer';
import { TransferComponent } from '../transfer.abstract';
import { TransferMetricsStore } from '../transfer-metrics.store';

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
    super(
      store.select(selectSendTransfer).pipe(
        map((transfer) => ({
          transferred: transfer.sent,
          total: transfer.total,
          route: transfer.route,
          verified: transfer.verified
        }))
      ),
      store.select(selectSendMetadata),
      store.select(selectSendPeerIdentity)
    );
  }

  protected cancel(): void {
    this.store.dispatch(sendDisconnect());
  }
}
