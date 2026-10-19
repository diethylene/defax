import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  PageShellComponent,
  type PageStep
} from '../../../core/components/page-shell/page-shell';
import {
  receiveCodeEntered,
  receiveReset
} from '../../../store/actions/receive.actions';
import { selectReceivePhase } from '../../../store/selectors/receive.selectors';
import { ReceiveCodeFormComponent } from '../receive-code-form/receive-code-form';

@Component({
  selector: 'app-receive-idle',
  imports: [PageShellComponent, ReceiveCodeFormComponent, HlmButton],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-idle.html'
})
export class ReceiveIdleComponent {
  private readonly store = inject(Store);

  protected readonly phase = toSignal(this.store.select(selectReceivePhase), {
    initialValue: 'idle'
  });

  protected readonly connecting = computed(() => this.phase() === 'connecting');

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

  protected onConnect(code: string): void {
    this.store.dispatch(receiveCodeEntered({ code }));
  }

  protected onCancel(): void {
    this.store.dispatch(receiveReset());
  }
}
