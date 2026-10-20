import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TransferCompleteComponent } from '../../../core/components/transfer/transfer-complete/transfer-complete';
import { receiveReset } from '../../../store/actions/receive.actions';
import {
  selectReceiveDigest,
  selectReceiveFile,
  selectReceivePeerIdentity,
  selectReceiveTransferDurationMs
} from '../../../store/selectors/receive.selectors';

@Component({
  selector: 'app-receive-complete',
  imports: [TransferCompleteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-transfer-complete
      mode="receive"
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
export class ReceiveCompleteComponent {
  private readonly store = inject(Store);

  private readonly file = toSignal(this.store.select(selectReceiveFile), {
    initialValue: null
  });

  private readonly peerIdentity = toSignal(
    this.store.select(selectReceivePeerIdentity),
    { initialValue: null }
  );

  protected readonly digest = toSignal(this.store.select(selectReceiveDigest), {
    initialValue: null
  });

  private readonly durationMs = toSignal(
    this.store.select(selectReceiveTransferDurationMs),
    { initialValue: null }
  );

  protected readonly fileName = computed(() => this.file()?.name ?? '');
  protected readonly fileSize = computed(() => this.file()?.size ?? 0);
  protected readonly peerBrowser = computed(
    () => this.peerIdentity()?.browser ?? ''
  );
  protected readonly peerOs = computed(() => this.peerIdentity()?.os ?? '');
  protected readonly timeTaken = computed(() => {
    const ms = this.durationMs();
    return ms === null ? null : ms / 1000;
  });

  protected onRestart(): void {
    this.store.dispatch(receiveReset());
  }
}
