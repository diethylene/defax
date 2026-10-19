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
import {
  type FileSummary,
  FingerprintCardComponent
} from '../../core/components/fingerprint-card/fingerprint-card';
import { PageShellComponent } from '../../core/components/page-shell/page-shell';
import { SasNumberComponent } from '../../core/components/sas-number/sas-number';
import {
  receiveAccepted,
  receiveReset
} from '../../store/actions/receive.actions';
import {
  selectReceiveFile,
  selectReceivePeerIdentity,
  selectReceiveSas
} from '../../store/selectors/receive.selectors';

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
  templateUrl: './receive-confirm.html'
})
export class ReceiveConfirmComponent {
  private readonly store = inject(Store);

  protected readonly sas = toSignal(this.store.select(selectReceiveSas), {
    initialValue: null
  });

  protected readonly peerIdentity = toSignal(
    this.store.select(selectReceivePeerIdentity),
    { initialValue: null }
  );

  protected readonly file = toSignal(this.store.select(selectReceiveFile), {
    initialValue: null
  });

  protected readonly fileSummary = computed<FileSummary | null>(() => {
    const file = this.file();
    return file ? { name: file.name, size: file.size } : null;
  });

  protected decline(): void {
    this.store.dispatch(receiveReset());
  }

  protected accept(): void {
    this.store.dispatch(receiveAccepted());
  }
}
