import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import {
  type FileSummary,
  FingerprintCardComponent,
} from '../../../core/components/fingerprint-card/fingerprint-card.component';
import { PageShellComponent } from '../../../core/components/page-shell/page-shell.component';
import { SasNumberComponent } from '../../../core/components/sas-number/sas-number.component';

@Component({
  selector: 'app-receive-confirm',
  imports: [
    PageShellComponent,
    SasNumberComponent,
    FingerprintCardComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
  ],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-confirm.html',
})
export class ReceiveConfirmComponent {
  private readonly store = inject(Store);

  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  private readonly confirming = computed(() =>
    Match.value(this.status()).pipe(
      Match.when({ _tag: 'Confirming' }, (status) => status),
      Match.orElse(() => undefined),
    ),
  );

  protected readonly sas = computed(() => this.confirming()?.sas);

  protected readonly peerIdentity = computed(
    () => this.confirming()?.peerIdentity,
  );

  protected readonly file = computed(() => this.confirming()?.file);

  protected readonly digest = computed(() => this.confirming()?.digest);

  protected readonly fileSummary = computed<FileSummary | undefined>(() => {
    const file = this.file();
    return file ? { name: file.name, size: file.size } : undefined;
  });

  protected decline(): void {
    this.store.dispatch(ReceiveActions.disconnect());
  }

  protected accept(): void {
    this.store.dispatch(ReceiveActions.accepted());
  }
}
