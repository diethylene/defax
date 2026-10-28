import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import { TransferCompleteComponent } from '../../../core/components/transfer/transfer-complete/transfer-complete';

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
  `,
})
export class ReceiveCompleteComponent {
  private readonly store = inject(Store);

  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  private readonly done = computed(() =>
    Match.value(this.status()).pipe(
      Match.when({ _tag: 'Done' }, (status) => status),
      Match.orElse(() => undefined),
    ),
  );

  protected readonly digest = computed(() => this.done()?.digest ?? null);

  protected readonly fileName = computed(() => this.done()?.file.name ?? '');
  protected readonly fileSize = computed(() => this.done()?.file.size ?? 0);
  protected readonly peerBrowser = computed(
    () => this.done()?.peerIdentity.browser ?? '',
  );
  protected readonly peerOs = computed(() => this.done()?.peerIdentity.os ?? '');
  protected readonly timeTaken = computed(() => {
    const done = this.done();
    return done === undefined ? null : done.elapsedMs / 1000;
  });

  protected onRestart(): void {
    this.store.dispatch(ReceiveActions.reset());
  }
}
