import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
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
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { parseReceiveCode } from '../../../shared/utilities/passcode';

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

const grow = trigger('grow', [
  transition(':enter', [
    style({ opacity: 0, height: 0 }),
    animate('200ms ease-out', style({ opacity: 1, height: '*' }))
  ]),
  transition(':leave', [
    animate('200ms ease-out', style({ opacity: 0, height: 0 }))
  ])
]);

const check = trigger('check', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.5)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('120ms ease-out', style({ opacity: 0, transform: 'scale(0.5)' }))
  ])
]);

@Component({
  selector: 'app-receive-code-form',
  imports: [
    NgIcon,
    ReactiveFormsModule,
    SpinnerComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmInput,
    HlmLabel,
    HlmSeparator
  ],
  providers: [
    provideIcons({ lucideCheck }),
    { provide: ErrorStateMatcher, useClass: NoopErrorStateMatcher }
  ],
  animations: [grow, check],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-code-form.html'
})
export class ReceiveCodeFormComponent {
  readonly connect = output<string>();
  readonly connecting = input(false);

  protected readonly code = new FormControl<string>('', {
    nonNullable: true,
    validators: [receiveCodeValidator]
  });

  protected readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (this.connecting()) {
        this.code.disable();
        return;
      }
      this.code.enable();
      this.code.reset();
      this.submitted.set(false);
    });
  }

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
