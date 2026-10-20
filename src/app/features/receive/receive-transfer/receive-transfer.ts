import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell';
import { TransferMetricsStore } from '../../../core/components/transfer-progress/transfer-metrics.store';
import {
  type TransferProgress,
  TransferProgressComponent
} from '../../../core/components/transfer-progress/transfer-progress';
import { formatDuration } from '../../../shared/utilities/duration';
import { formatFileSize } from '../../../shared/utilities/file-size';
import { receiveDisconnect } from '../../../store/actions/receive.actions';
import {
  selectReceiveFile,
  selectReceivePeerIdentity,
  selectReceiveTransfer
} from '../../../store/selectors/receive.selectors';

@Component({
  selector: 'app-receive-transfer',
  imports: [PageShellComponent, TransferProgressComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-transfer.html'
})
export class ReceiveTransferComponent {
  private readonly store = inject(Store);
  private readonly metrics = inject(TransferMetricsStore);

  private readonly transfer = toSignal(
    this.store.select(selectReceiveTransfer),
    { initialValue: { received: 0, total: 0, route: null } }
  );
  private readonly file = toSignal(this.store.select(selectReceiveFile), {
    initialValue: null
  });
  private readonly peerIdentity = toSignal(
    this.store.select(selectReceivePeerIdentity),
    { initialValue: null }
  );

  constructor() {
    effect(() => this.metrics.sample(this.transfer().received));
  }

  protected readonly progress = computed<TransferProgress>(() => {
    const transfer = this.transfer();
    const file = this.file();
    const peer = this.peerIdentity();
    const speed = this.metrics.speed();
    const percent =
      transfer.total > 0
        ? Math.round((transfer.received / transfer.total) * 100)
        : 0;
    const remaining = transfer.total - transfer.received;
    const timeLeftSeconds = speed > 0 ? remaining / speed : null;

    return {
      fileName: file?.name ?? '',
      peerBrowser: peer?.browser ?? '',
      peerOs: peer?.os ?? '',
      percent,
      sent: `${formatFileSize(transfer.received)} of ${formatFileSize(transfer.total)}`,
      speed: speed > 0 ? `${formatFileSize(speed)}/s` : '',
      timeLeft:
        timeLeftSeconds === null
          ? ''
          : `About ${formatDuration(timeLeftSeconds)}`,
      route: transfer.route ?? 'direct'
    };
  });

  protected cancel(): void {
    this.store.dispatch(receiveDisconnect());
  }
}
