import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TransferCompleteComponent } from '../../../core/components/transfer/transfer-complete/transfer-complete';
import { sendReset } from '../../../store/actions/send.actions';
import {
  selectSendHashDigest,
  selectSendMetadata,
  selectSendPeerIdentity,
  selectSendTransferDurationMs
} from '../../../store/selectors/send.selectors';

@Component({
  selector: 'app-send-complete',
  imports: [TransferCompleteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-transfer-complete
      mode="send"
      [fileName]="fileName()"
      [fileSize]="fileSize()"
      [peerBrowser]="peerBrowser()"
      [peerOs]="peerOs()"
      [timeTaken]="timeTaken()"
      [checksum]="digest()"
      (restart)="onRestart()"
    />
  `
})
export class SendCompleteComponent {
  private readonly store = inject(Store);

  private readonly metadata = toSignal(this.store.select(selectSendMetadata), {
    initialValue: null
  });

  private readonly peerIdentity = toSignal(
    this.store.select(selectSendPeerIdentity),
    { initialValue: null }
  );

  protected readonly digest = toSignal(
    this.store.select(selectSendHashDigest),
    {
      initialValue: null
    }
  );

  private readonly durationMs = toSignal(
    this.store.select(selectSendTransferDurationMs),
    { initialValue: null }
  );

  protected readonly fileName = computed(() => this.metadata()?.name ?? '');
  protected readonly fileSize = computed(() => this.metadata()?.size ?? 0);
  protected readonly peerBrowser = computed(
    () => this.peerIdentity()?.browser ?? ''
  );
  protected readonly peerOs = computed(() => this.peerIdentity()?.os ?? '');
  protected readonly timeTaken = computed(() => {
    const ms = this.durationMs();
    return ms === null ? null : ms / 1000;
  });

  protected onRestart(): void {
    this.store.dispatch(sendReset());
  }
}
