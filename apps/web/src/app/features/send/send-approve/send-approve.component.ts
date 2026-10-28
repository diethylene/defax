import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import * as Match from 'effect/Match';
import {
  type FileSummary,
  FingerprintCardComponent
} from '../../../core/components/fingerprint-card/fingerprint-card';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell';
import { SasNumberComponent } from '../../../core/components/sas-number/sas-number';
import { SendActions } from '../../../store/send/send.actions';
import {
  hashDigestOf,
  selectSendStatus
} from '../../../store/send/send.selectors';

/** Waits while the receiver checks the sender and the file. */
@Component({
  selector: 'app-send-approve',
  imports: [
    PageShellComponent,
    SasNumberComponent,
    FingerprintCardComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmSpinner
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-approve.component.html'
})
export class SendApproveComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** Current send status. */
  private readonly status = this.store.selectSignal(selectSendStatus);

  /** Confirming status, or undefined while the send is elsewhere. */
  private readonly confirming = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('SasConfirm', (status) => status),
      Match.orElse(() => undefined)
    )
  );

  /** Verification number both screens show. */
  protected readonly sas = computed(() => this.confirming()?.sas ?? null);

  /** Identity of the receiving peer. */
  protected readonly peerIdentity = computed(
    () => this.confirming()?.peerIdentity ?? null
  );

  /** Metadata of the file being sent. */
  protected readonly metadata = computed(
    () => this.confirming()?.metadata ?? null
  );

  /** Digest of the file being sent. */
  protected readonly digest = computed(() => hashDigestOf(this.status()));

  /** Name and size shown on the fingerprint card. */
  protected readonly fileSummary = computed<FileSummary | null>(() => {
    const metadata = this.metadata();
    return metadata ? { name: metadata.name, size: metadata.size } : null;
  });

  /** Cancels the transfer and disconnects. */
  protected cancel(): void {
    this.store.dispatch(SendActions.disconnect());
  }
}
