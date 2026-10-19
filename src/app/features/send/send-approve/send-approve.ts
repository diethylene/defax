import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import {
  type FileSummary,
  FingerprintCardComponent
} from '../../../core/components/fingerprint-card/fingerprint-card';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell';
import { SasNumberComponent } from '../../../core/components/sas-number/sas-number';
import { sendReset } from '../../../store/actions/send.actions';
import {
  selectSendMetadata,
  selectSendPeerIdentity,
  selectSendSas
} from '../../../store/selectors/send.selectors';

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

  protected readonly sas = toSignal(this.store.select(selectSendSas), {
    initialValue: null
  });

  protected readonly peerIdentity = toSignal(
    this.store.select(selectSendPeerIdentity),
    { initialValue: null }
  );

  protected readonly metadata = toSignal(
    this.store.select(selectSendMetadata),
    { initialValue: null }
  );

  protected readonly fileSummary = computed<FileSummary | null>(() => {
    const metadata = this.metadata();
    return metadata ? { name: metadata.name, size: metadata.size } : null;
  });

  protected cancel(): void {
    this.store.dispatch(sendReset());
  }
}
