import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectSendError } from '../../../store/selectors/send.selectors';

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

  protected readonly error = toSignal(this.store.select(selectSendError), {
    initialValue: null
  });
}
