import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { toast } from '@spartan-ng/brain/sonner';
import * as Match from 'effect/Match';
import { hashOf, selectSendStatus } from '../../../store/send/send.selectors';
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
  private readonly status = this.store.selectSignal(selectSendStatus);
  private readonly hashTag = computed(() => hashOf(this.status())._tag);

  constructor() {
    effect(() => {
      this.hashTag();
      untracked(() => {
        const hash = hashOf(this.status());
        Match.value(hash).pipe(
          Match.tag('Hashing', () => {
            toast.custom(HashProgressToastComponent, {
              id: HASH_PROGRESS_TOAST_ID,
              dismissible: false,
              duration: Infinity
            });
          }),
          Match.tag('Complete', ({ digest }) => {
            toast.dismiss(HASH_PROGRESS_TOAST_ID);
            toast.success('SHA-256 checksum complete', {
              description: digest
            });
          }),
          Match.tag('Idle', () => {
            toast.dismiss(HASH_PROGRESS_TOAST_ID);
          }),
          Match.exhaustive
        );
      });
    });
  }
}
