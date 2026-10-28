import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import { TransferCompleteComponent } from '../../../core/components/transfer/transfer-complete/transfer-complete.component';

/** Shows the result of a finished receive. */
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
  /** Global store. */
  private readonly store = inject(Store);

  /** Current receive status. */
  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  /** Done status, or undefined while the receive has not finished. */
  private readonly done = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('Done', (status) => status),
      Match.orElse(() => undefined)
    )
  );

  /** Digest produced by the received file. */
  protected readonly digest = computed(() => this.done()?.digest);

  /** Name of the received file. */
  protected readonly fileName = computed(() => this.done()?.file.name ?? '');

  /** Size of the received file in bytes. */
  protected readonly fileSize = computed(() => this.done()?.file.size ?? 0);

  /** Browser of the peer that sent the file. */
  protected readonly peerBrowser = computed(
    () => this.done()?.peerIdentity.browser ?? ''
  );

  /** Operating system of the peer that sent the file. */
  protected readonly peerOs = computed(
    () => this.done()?.peerIdentity.os ?? ''
  );

  /** Seconds the receive took, or undefined while it is unfinished. */
  protected readonly timeTaken = computed(() => {
    const done = this.done();
    return done === undefined ? undefined : done.elapsedMs / 1000;
  });

  /** Starts a new receive. */
  protected onRestart(): void {
    this.store.dispatch(ReceiveActions.reset());
  }
}
