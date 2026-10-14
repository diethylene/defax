import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { ShaChecksumComponent } from '../../core/components/sha-checksum/sha-checksum';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { FileTypePipe } from '../../shared/pipes/file-type.pipe';
import { sendReset } from '../../store/actions/send.actions';
import {
  selectSendHashDigest,
  selectSendMetadata,
  selectSendPassword
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
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmSeparator,
    HlmSkeleton,
    HlmSpinner
  ],
  providers: [provideIcons({ lucideFile })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-code.html'
})
export class SendCodeComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly passcode = toSignal(
    this.store.select(selectSendPassword),
    {
      initialValue: null
    }
  );

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
