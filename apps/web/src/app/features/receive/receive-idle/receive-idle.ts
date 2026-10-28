import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import {
  PageShellComponent,
  type PageStep,
} from '../../../core/components/page-shell/page-shell';
import { ReceiveCodeFormComponent } from '../receive-code-form/receive-code-form';

@Component({
  selector: 'app-receive-idle',
  imports: [PageShellComponent, ReceiveCodeFormComponent, HlmButton],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-idle.html',
})
export class ReceiveIdleComponent {
  private readonly store = inject(Store);

  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  protected readonly connecting = computed(() =>
    Match.value(this.status()).pipe(
      Match.when({ _tag: 'Connecting' }, () => true),
      Match.orElse(() => false),
    ),
  );

  protected readonly steps: PageStep[] = [
    {
      title: 'Enter the code.',
      description: "Your device connects to the sender's.",
    },
    {
      title: 'Check the details.',
      description: 'Confirm the file and sender are who you expect.',
    },
    {
      title: 'Receive.',
      description: 'The file arrives encrypted and is checked on arrival.',
    },
  ];

  protected onConnect(code: string): void {
    this.store.dispatch(ReceiveActions.codeEntered({ code }));
  }

  protected onCancel(): void {
    this.store.dispatch(ReceiveActions.disconnect());
  }
}
