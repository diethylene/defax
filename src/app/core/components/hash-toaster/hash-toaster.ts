import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import {
  selectSendHashError,
  selectSendHashStatus
} from '../../../store/selectors/send.selectors';
import { HashProgressToastComponent } from './hash-progress-toast';

const HASH_PROGRESS_TOAST_ID = 'file-hash-progress';

@Component({
  selector: 'app-hash-toaster',
  imports: [HlmToasterImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<hlm-toaster />'
})
export class HashToasterComponent {
  private readonly store = inject(Store);

  private readonly status = toSignal(this.store.select(selectSendHashStatus));
  private readonly error = toSignal(this.store.select(selectSendHashError));

  constructor() {
    effect(() => {
      const status = this.status() ?? 'idle';

      if (status === 'hashing') {
        toast.custom(HashProgressToastComponent, {
          id: HASH_PROGRESS_TOAST_ID,
          dismissible: false,
          duration: Infinity
        });
        return;
      }

      toast.dismiss(HASH_PROGRESS_TOAST_ID);

      if (status === 'failed') {
        toast.error(this.error() ?? 'File hashing failed', {
          duration: Infinity,
          closeButton: true
        });
      }
    });
  }
}
