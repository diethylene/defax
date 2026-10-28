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
  private readonly status = this.store.selectSignal(selectSendStatus);

  private readonly done = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('Done', (status) => status),
      Match.orElse(() => null)
    )
  );

  protected readonly digest = computed(() => hashDigestOf(this.status()));

  protected readonly fileName = computed(
    () => this.done()?.metadata.name ?? ''
  );
  protected readonly fileSize = computed(
    () => this.done()?.metadata.size ?? 0
  );
  protected readonly peerBrowser = computed(
    () => this.done()?.peerIdentity.browser ?? ''
  );
  protected readonly peerOs = computed(
    () => this.done()?.peerIdentity.os ?? ''
  );
  protected readonly timeTaken = computed(() => {
    const durationMs = this.done()?.durationMs;
    return durationMs === undefined ? undefined : durationMs / 1000;
  });

  protected onRestart(): void {
    this.store.dispatch(SendActions.reset());
  }
}
