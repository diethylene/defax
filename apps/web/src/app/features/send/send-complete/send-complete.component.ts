import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Store } from '@ngrx/store';
import * as Match from 'effect/Match';
import { TransferCompleteComponent } from '../../../core/components/transfer/transfer-complete/transfer-complete.component';
import { SendActions } from '../../../store/send/send.actions';
import {
  hashDigestOf,
  selectSendStatus
} from '../../../store/send/send.selectors';

/** Shows the result of a finished send. */
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
  /** Global store. */
  private readonly store = inject(Store);

  /** Current send status. */
  private readonly status = this.store.selectSignal(selectSendStatus);

  /** Done status, or undefined while the send has not finished. */
  private readonly done = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('Done', (status) => status),
      Match.orElse(() => undefined)
    )
  );

  /** Digest of the sent file. */
  protected readonly digest = computed(() => hashDigestOf(this.status()));

  /** Name of the sent file. */
  protected readonly fileName = computed(
    () => this.done()?.metadata.name ?? ''
  );

  /** Size of the sent file in bytes. */
  protected readonly fileSize = computed(
    () => this.done()?.metadata.size ?? 0
  );

  /** Browser of the receiving peer. */
  protected readonly peerBrowser = computed(
    () => this.done()?.peerIdentity.browser ?? ''
  );

  /** Operating system of the receiving peer. */
  protected readonly peerOs = computed(
    () => this.done()?.peerIdentity.os ?? ''
  );

  /** Seconds the send took, or undefined while it is unfinished. */
  protected readonly timeTaken = computed(() => {
    const durationMs = this.done()?.durationMs;
    return durationMs === undefined ? undefined : durationMs / 1000;
  });

  /** Starts a new send. */
  protected onRestart(): void {
    this.store.dispatch(SendActions.reset());
  }
}
