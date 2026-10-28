import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import type { TransferSnapshot } from '@web/core/interfaces/transfer.interface';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import type { ReceiveStatus } from '@web/store/receive/receive-transitions';
import * as Match from 'effect/Match';
import { map } from 'rxjs';
import { PageShellComponent } from '../../page-shell/page-shell.component';
import { ProgressTransferComponent } from '../progress-transfer/progress-transfer.component';
import { TransferComponent } from '../transfer.component';
import { TransferMetricsStore } from '../transfer-metrics.store';

/** Statuses that show a transfer in flight. */
type ActiveReceive = Extract<ReceiveStatus, { _tag: 'Transferring' | 'Verifying' }>;

/**
 * Narrows a status to one that shows a transfer in flight.
 * @param status Current receive status.
 * @returns The status while a transfer is running, or none.
 */
const activeOf = (status: ReceiveStatus): ActiveReceive | undefined =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Transferring' }, (active) => active),
    Match.when({ _tag: 'Verifying' }, (active) => active),
    Match.orElse(() => undefined),
  );

/**
 * Builds the progress snapshot for a status.
 * @param status Current receive status.
 * @returns Snapshot the progress view shows.
 */
const snapshotOf = (status: ReceiveStatus): TransferSnapshot => {
  const progress = activeOf(status)?.progress;
  return {
    transferred: progress?.received ?? 0,
    total: progress?.total ?? 0,
    route: progress?.route ?? null,
    verified: false,
  };
};

/**
 * Reads the file a running transfer carries.
 * @param status Current receive status.
 * @returns Metadata of the file, or null when no transfer is running.
 */
const fileOf = (status: ReceiveStatus): FileMetadata | null =>
  activeOf(status)?.file ?? null;

/**
 * Reads the peer a running transfer carries.
 * @param status Current receive status.
 * @returns Identity of the sender, or null when no transfer is running.
 */
const peerOf = (status: ReceiveStatus): Identity | null =>
  activeOf(status)?.peerIdentity ?? null;

/**
 * Tells whether a status is checking the arrived file.
 * @param status Current receive status.
 * @returns True while the file is being verified.
 */
const verifyingOf = (status: ReceiveStatus): boolean =>
  activeOf(status)?._tag === 'Verifying';

@Component({
  selector: 'app-receiver-transfer',
  imports: [PageShellComponent, ProgressTransferComponent, HlmButton],
  providers: [TransferMetricsStore],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receiver-transfer.component.html',
})
export class ReceiverTransferComponent extends TransferComponent {
  constructor() {
    const store = inject(Store);
    const status$ = store.select(receiveFeature.selectStatus);
    super(
      status$.pipe(map(snapshotOf)),
      status$.pipe(map(fileOf)),
      status$.pipe(map(peerOf)),
      status$.pipe(map(verifyingOf)),
    );
  }

  protected cancel(): void {
    this.store.dispatch(ReceiveActions.disconnect());
  }
}
