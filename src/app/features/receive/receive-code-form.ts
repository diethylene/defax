import {
  ChangeDetectionStrategy,
  Component,
  output,
  signal
} from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  type ValidatorFn
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { ErrorStateMatcher } from '@spartan-ng/brain/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { parseReceiveCode } from '../../shared/utilities/passcode';

const receiveCodeValidator: ValidatorFn = (control) => {
  const value = control.value;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return parseReceiveCode(value) ? null : { receiveCode: true };
};

// Spartan auto-flags invalid on touched/dirty by default. Suppress that so the
// form only shows an error after a submit attempt, driven by forceInvalid below.
class NoopErrorStateMatcher extends ErrorStateMatcher {
  override isInvalid(): boolean {
    return false;
  }
}

@Component({
  selector: 'app-receive-code-form',
  imports: [
    NgIcon,
    ReactiveFormsModule,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmInput,
    HlmLabel
  ],
  providers: [
    provideIcons({ lucideCheck }),
    { provide: ErrorStateMatcher, useClass: NoopErrorStateMatcher }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-code-form.html'
})
export class ReceiveCodeFormComponent {
  readonly connect = output<string>();

  protected readonly code = new FormControl<string>('', {
    nonNullable: true,
    validators: [receiveCodeValidator]
  });

  protected readonly submitted = signal(false);

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (this.code.invalid) {
      this.submitted.set(true);
      return;
    }
    const parsed = parseReceiveCode(this.code.value);
    if (parsed) {
      this.connect.emit(`${parsed.roomId}-${parsed.password}`);
    }
  }
}
