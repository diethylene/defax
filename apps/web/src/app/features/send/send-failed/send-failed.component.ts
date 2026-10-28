import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectSendErrorMessage } from '../../../store/send/send.selectors';

/** Shows why a send stopped. */
@Component({
  selector: 'app-send-failed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <p class="text-foreground">Transfer failed</p>
      @let message = error();
      @if (message) {
        <p class="mt-2 text-sm text-muted-foreground">{{ message }}</p>
      }
    </div>
  `
})
export class SendFailedComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** User-facing reason for the failure, or null while there is none. */
  protected readonly error = this.store.selectSignal(selectSendErrorMessage);
}
