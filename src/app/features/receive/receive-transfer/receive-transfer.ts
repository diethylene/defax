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
import { receiveDisconnect } from '../../../store/actions/receive.actions';
import {
  selectReceiveFile,
  selectReceivePeerIdentity,
  selectReceiveTransfer
} from '../../../store/selectors/receive.selectors';

const SAMPLE_INTERVAL_MS = 1000;

const initialTransfer = { received: 0, total: 0, route: null };

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

  private readonly liveTransfer = toSignal(
    this.store.select(selectReceiveTransfer),
    { initialValue: initialTransfer }
  );
  private readonly sampledTransfer = toSignal(
    this.store.select(selectReceiveTransfer).pipe(
      throttleTime(SAMPLE_INTERVAL_MS, undefined, {
        leading: true,
        trailing: true
      })
    ),
    { initialValue: initialTransfer }
  );
  private readonly file = toSignal(this.store.select(selectReceiveFile), {
    initialValue: null
  });
  private readonly peerIdentity = toSignal(
    this.store.select(selectReceivePeerIdentity),
    { initialValue: null }
  );

  constructor() {
    effect(() => this.metrics.sample(this.sampledTransfer().received));
  }

  protected readonly progress = computed<TransferProgress>(() => {
    const live = this.liveTransfer();
    const sampled = this.sampledTransfer();
    const file = this.file();
    const peer = this.peerIdentity();
    const speed = this.metrics.speed();
    const percent =
      live.total > 0 ? Math.round((live.received / live.total) * 100) : 0;
    const remaining = sampled.total - sampled.received;
    const timeLeft = speed > 0 ? remaining / speed : null;

    return {
      fileName: file?.name ?? '',
      peerBrowser: peer?.browser ?? '',
      peerOs: peer?.os ?? '',
      percent,
      sent: sampled.received,
      total: sampled.total,
      speed,
      timeLeft,
      route: sampled.route ?? 'direct'
    };
  });

  protected cancel(): void {
    this.store.dispatch(receiveDisconnect());
  }
}
