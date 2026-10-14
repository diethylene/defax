import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { SendCodeFieldComponent } from './send-code-field';

@Component({
  selector: 'app-send-code',
  imports: [
    SendCodeFieldComponent,
    HlmCard,
    HlmCardContent,
    HlmSeparator,
    HlmSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-code.html'
})
export class SendCodeComponent {
  protected readonly passcode = '7-orbit-maple-lantern';
}
