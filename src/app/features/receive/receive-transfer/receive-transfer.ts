import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell';
import {
  type TransferProgress,
  TransferProgressComponent
} from '../../../core/components/transfer-progress/transfer-progress';
import { receiveDisconnect } from '../../../store/actions/receive.actions';

const SAMPLE_PROGRESS: TransferProgress = {
  fileName: 'vacation-photos.zip',
  peerBrowser: 'Firefox',
  peerOs: 'macOS',
  percent: 61,
  sent: '1.12 of 1.84 GB',
  speed: '38.4 MB/s',
  timeLeft: 'About 19s',
  route: 'direct'
};

@Component({
  selector: 'app-receive-transfer',
  imports: [PageShellComponent, TransferProgressComponent, HlmButton],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-transfer.html'
})
export class ReceiveTransferComponent {
  private readonly store = inject(Store);

  protected readonly progress: TransferProgress = SAMPLE_PROGRESS;

  protected cancel(): void {
    this.store.dispatch(receiveDisconnect());
  }
}
