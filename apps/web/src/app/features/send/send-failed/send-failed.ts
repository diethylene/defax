import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectSendErrorMessage } from '../../../store/send/send.selectors';

@Component({
  selector: 'app-send-failed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <p class="text-foreground">Transfer failed</p>
      @if (error()) {
        <p class="mt-2 text-sm text-muted-foreground">{{ error() }}</p>
      }
    </div>
  `
})
export class SendFailedComponent {
  private readonly store = inject(Store);

  protected readonly error = this.store.selectSignal(selectSendErrorMessage);
}
