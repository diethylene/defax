import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import {
  type FileSummary,
  FingerprintCardComponent
} from '../../../core/components/fingerprint-card/fingerprint-card';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell';
import { SasNumberComponent } from '../../../core/components/sas-number/sas-number';

/** Asks the user to confirm the sender, the file, and the verification number. */
@Component({
  selector: 'app-receive-confirm',
  imports: [
    PageShellComponent,
    SasNumberComponent,
    FingerprintCardComponent,
    HlmButton,
    HlmCard,
    HlmCardContent
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-confirm.component.html'
})
export class ReceiveConfirmComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** Current receive status. */
  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  /** Confirming status, or undefined while the receive is elsewhere. */
  private readonly confirming = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('Confirming', (status) => status),
      Match.orElse(() => undefined)
    )
  );

  /** Verification number both screens show. */
  protected readonly sas = computed(() => this.confirming()?.sas ?? null);

  /** Identity of the sending peer. */
  protected readonly peerIdentity = computed(
    () => this.confirming()?.peerIdentity ?? null
  );

  /** Metadata of the offered file. */
  protected readonly file = computed(() => this.confirming()?.file ?? null);

  /** Digest of the offered file. */
  protected readonly digest = computed(
    () => this.confirming()?.digest ?? null
  );

  /** Name and size shown on the fingerprint card. */
  protected readonly fileSummary = computed<FileSummary | null>(() => {
    const file = this.file();
    return file ? { name: file.name, size: file.size } : null;
  });

  /** Declines the transfer and disconnects. */
  protected decline(): void {
    this.store.dispatch(ReceiveActions.disconnect());
  }

  /** Accepts the transfer. */
  protected accept(): void {
    this.store.dispatch(ReceiveActions.accepted());
  }
}
