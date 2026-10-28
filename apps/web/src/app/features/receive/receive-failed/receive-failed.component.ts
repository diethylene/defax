import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectReceiveErrorMessage } from '@web/store/receive/receive.selectors';

/** Shows why a receive stopped. */
@Component({
  selector: 'app-receive-failed',
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
export class ReceiveFailedComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** User-facing reason for the failure, or null while there is none. */
  protected readonly error = this.store.selectSignal(selectReceiveErrorMessage);
}
