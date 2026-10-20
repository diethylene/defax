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
import { throttleTime } from 'rxjs';
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

const SAMPLE_INTERVAL_MS = 1000;

const initialTransfer = { sent: 0, total: 0, route: null };

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

  private readonly liveTransfer = toSignal(
    this.store.select(selectSendTransfer),
    { initialValue: initialTransfer }
  );
  private readonly sampledTransfer = toSignal(
    this.store.select(selectSendTransfer).pipe(
      throttleTime(SAMPLE_INTERVAL_MS, undefined, {
        leading: true,
        trailing: true
      })
    ),
    { initialValue: initialTransfer }
  );
  private readonly metadata = toSignal(this.store.select(selectSendMetadata), {
    initialValue: null
  });
  private readonly peerIdentity = toSignal(
    this.store.select(selectSendPeerIdentity),
    { initialValue: null }
  );

  constructor() {
    effect(() => this.metrics.sample(this.sampledTransfer().sent));
  }

  protected readonly progress = computed<TransferProgress>(() => {
    const live = this.liveTransfer();
    const sampled = this.sampledTransfer();
    const metadata = this.metadata();
    const peer = this.peerIdentity();
    const speed = this.metrics.speed();
    const percent =
      live.total > 0 ? Math.round((live.sent / live.total) * 100) : 0;
    const remaining = sampled.total - sampled.sent;
    const timeLeft = speed > 0 ? remaining / speed : null;

    return {
      fileName: metadata?.name ?? '',
      peerBrowser: peer?.browser ?? '',
      peerOs: peer?.os ?? '',
      percent,
      sent: sampled.sent,
      total: sampled.total,
      speed,
      timeLeft,
      route: sampled.route ?? 'direct'
    };
  });

  protected cancel(): void {
    this.store.dispatch(sendDisconnect());
  }
}
