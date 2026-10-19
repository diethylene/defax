import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { distinctUntilChanged } from 'rxjs';
import { match } from 'ts-pattern';
import { selectSendHash } from '../../../store/selectors/send.selectors';
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
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.store
      .select(selectSendHash)
      .pipe(
        distinctUntilChanged((a, b) => a.status === b.status),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((hash) => {
        match(hash.status)
          .with('hashing', () => {
            toast.custom(HashProgressToastComponent, {
              id: HASH_PROGRESS_TOAST_ID,
              dismissible: false,
              duration: Infinity
            });
          })
          .with('complete', () => {
            toast.dismiss(HASH_PROGRESS_TOAST_ID);
            toast.success('SHA-256 checksum complete', {
              description: hash.digest ?? undefined
            });
          })
          .with('failed', () => {
            toast.dismiss(HASH_PROGRESS_TOAST_ID);
            toast.error(hash.error ?? 'File hashing failed', {
              duration: Infinity,
              closeButton: true
            });
          })
          .with('idle', () => {
            toast.dismiss(HASH_PROGRESS_TOAST_ID);
          })
          .exhaustive();
      });
  }
}
