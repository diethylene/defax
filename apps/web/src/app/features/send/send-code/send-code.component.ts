import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import * as Match from 'effect/Match';
import { ShaChecksumComponent } from '../../../core/components/sha-checksum/sha-checksum.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { FileTypePipe } from '../../../shared/pipes/file-type.pipe';
import { SendActions } from '../../../store/send/send.actions';
import {
  hashDigestOf,
  selectSendStatus
} from '../../../store/send/send.selectors';
import { SendCodeFieldComponent } from './send-code-field.component';

/** Shows the code the receiver enters while the sender waits for a connection. */
@Component({
  selector: 'app-send-code',
  imports: [
    DatePipe,
    FileSizePipe,
    FileTypePipe,
    NgIcon,
    SendCodeFieldComponent,
    ShaChecksumComponent,
    SpinnerComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmSeparator,
    HlmSkeleton
  ],
  providers: [provideIcons({ lucideFile })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-code.component.html'
})
export class SendCodeComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** Router, used to leave the page after a cancel. */
  private readonly router = inject(Router);

  /** Current send status. */
  private readonly status = this.store.selectSignal(selectSendStatus);

  /** Awaiting-peer status, or undefined while the send is elsewhere. */
  private readonly awaiting = computed(() =>
    Match.value(this.status()).pipe(
      Match.tag('AwaitingPeer', (status) => status),
      Match.orElse(() => undefined)
    )
  );

  /** Room id half of the code. */
  protected readonly roomId = computed(() => this.awaiting()?.roomId);

  /** Password half of the code. */
  protected readonly password = computed(() => this.awaiting()?.password);

  /** Full code the receiver types. */
  protected readonly passcode = computed(() => {
    const roomId = this.roomId();
    const password = this.password();
    return roomId && password ? `${roomId}-${password}` : '';
  });

  /** Metadata of the file being sent. */
  protected readonly metadata = computed(() => this.awaiting()?.metadata);

  /** Digest of the file being sent. */
  protected readonly digest = computed(() => hashDigestOf(this.status()));

  /** Cancels the transfer and returns to the send page. */
  protected cancel(): void {
    this.store.dispatch(SendActions.disconnect());
    this.router.navigate(['/send']);
  }
}
