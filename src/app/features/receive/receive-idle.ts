import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  PageShellComponent,
  type PageStep
} from '../../core/components/page-shell/page-shell';
import { receiveCodeEntered } from '../../store/actions/receive.actions';
import { ReceiveCodeFormComponent } from './receive-code-form';

@Component({
  selector: 'app-receive-idle',
  imports: [PageShellComponent, ReceiveCodeFormComponent],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-idle.html'
})
export class ReceiveIdleComponent {
  private readonly store = inject(Store);

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
}
