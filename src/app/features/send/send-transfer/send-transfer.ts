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
import { sendDisconnect } from '../../../store/actions/send.actions';
import {
  selectSendMetadata,
  selectSendPeerIdentity,
  selectSendTransfer
} from '../../../store/selectors/send.selectors';

@Component({
  selector: 'app-send-transfer',
  imports: [PageShellComponent, TransferProgressComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-transfer.html'
})
export class SendTransferComponent {
  private readonly store = inject(Store);
  private readonly metrics = inject(TransferMetricsStore);

  private readonly transfer = toSignal(this.store.select(selectSendTransfer), {
    initialValue: { sent: 0, total: 0, route: null }
  });
  private readonly metadata = toSignal(this.store.select(selectSendMetadata), {
    initialValue: null
  });
  private readonly peerIdentity = toSignal(
    this.store.select(selectSendPeerIdentity),
    { initialValue: null }
  );

  constructor() {
    effect(() => this.metrics.sample(this.transfer().sent));
  }

  protected readonly progress = computed<TransferProgress>(() => {
    const transfer = this.transfer();
    const metadata = this.metadata();
    const peer = this.peerIdentity();
    const speed = this.metrics.speed();
    const percent =
      transfer.total > 0
        ? Math.round((transfer.sent / transfer.total) * 100)
        : 0;
    const remaining = transfer.total - transfer.sent;
    const timeLeft = speed > 0 ? remaining / speed : null;

    return {
      fileName: metadata?.name ?? '',
      peerBrowser: peer?.browser ?? '',
      peerOs: peer?.os ?? '',
      percent,
      sent: transfer.sent,
      total: transfer.total,
      speed,
      timeLeft,
      route: transfer.route ?? 'direct'
    };
  });

  protected cancel(): void {
    this.store.dispatch(sendDisconnect());
  }
}
