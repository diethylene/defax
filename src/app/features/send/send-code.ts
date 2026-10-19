import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { ShaChecksumComponent } from '../../core/components/sha-checksum/sha-checksum';
import { SpinnerComponent } from '../../core/components/spinner/spinner';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { FileTypePipe } from '../../shared/pipes/file-type.pipe';
import { sendReset } from '../../store/actions/send.actions';
import {
  selectSendHashDigest,
  selectSendMetadata,
  selectSendPassword,
  selectSendRoomId
} from '../../store/selectors/send.selectors';
import { SendCodeFieldComponent } from './send-code-field';

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
  templateUrl: './send-code.html'
})
export class SendCodeComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly roomId = toSignal(this.store.select(selectSendRoomId), {
    initialValue: null
  });

  protected readonly password = toSignal(
    this.store.select(selectSendPassword),
    {
      initialValue: null
    }
  );

  protected readonly passcode = computed(() => {
    const roomId = this.roomId();
    const password = this.password();
    return roomId && password ? `${roomId}-${password}` : '';
  });

  protected readonly metadata = toSignal(
    this.store.select(selectSendMetadata),
    {
      initialValue: null
    }
  );

  protected readonly digest = toSignal(
    this.store.select(selectSendHashDigest),
    {
      initialValue: null
    }
  );

  protected cancel(): void {
    this.store.dispatch(sendReset());
    this.router.navigate(['/send']);
  }
}
