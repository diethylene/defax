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
} from '../../../core/components/fingerprint-card/fingerprint-card.component';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell.component';
import { SasNumberComponent } from '../../../core/components/sas-number/sas-number.component';
import { SendActions } from '../../../store/send/send.actions';
import {
  hashDigestOf,
  selectSendStatus
} from '../../../store/send/send.selectors';

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
  templateUrl: './send-approve.html'
})
export class SendApproveComponent {
  private readonly store = inject(Store);
  private readonly status = this.store.selectSignal(selectSendStatus);

  private readonly confirming = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('SasConfirm', (status) => status),
      Match.orElse(() => null)
    )
  );

  protected readonly sas = computed(() => this.confirming()?.sas);

  protected readonly peerIdentity = computed(
    () => this.confirming()?.peerIdentity
  );

  protected readonly metadata = computed(() => this.confirming()?.metadata);

  protected readonly digest = computed(() => hashDigestOf(this.status()));

  protected readonly fileSummary = computed<FileSummary | undefined>(() => {
    const metadata = this.metadata();
    return metadata ? { name: metadata.name, size: metadata.size } : undefined;
  });

  protected cancel(): void {
    this.store.dispatch(SendActions.disconnect());
  }
}
