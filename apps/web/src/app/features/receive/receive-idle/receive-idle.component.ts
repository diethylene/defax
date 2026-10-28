import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import * as Match from 'effect/Match';
import {
  PageShellComponent,
  type PageStep
} from '../../../core/components/page-shell/page-shell.component';
import { ReceiveCodeFormComponent } from '../receive-code-form/receive-code-form.component';

/** Asks for the sender's code and starts the receive. */
@Component({
  selector: 'app-receive-idle',
  imports: [PageShellComponent, ReceiveCodeFormComponent, HlmButton],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-idle.component.html'
})
export class ReceiveIdleComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** Current receive status. */
  private readonly status = this.store.selectSignal(receiveFeature.selectStatus);

  /** True while the receive is connecting. */
  protected readonly connecting = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('Connecting', () => true),
      Match.orElse(() => false)
    )
  );

  /** Steps shown beside the form. */
  protected readonly steps: PageStep[] = [
    {
      title: 'Enter the code.',
      description: "Your device connects to the sender's."
    },
    {
      title: 'Check the details.',
      description: 'Confirm the file and sender are who you expect.'
    },
    {
      title: 'Receive.',
      description: 'The file arrives encrypted and is checked on arrival.'
    }
  ];

  /**
   * Starts a receive with the entered code.
   * @param code Parsed code from the form.
   */
  protected onConnect(code: string): void {
    this.store.dispatch(ReceiveActions.codeEntered({ code }));
  }

  /** Cancels the connection attempt. */
  protected onCancel(): void {
    this.store.dispatch(ReceiveActions.disconnect());
  }
}
