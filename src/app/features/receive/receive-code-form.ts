import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { parseReceiveCode } from '../../shared/utilities/passcode';

@Component({
  selector: 'app-receive-code-form',
  imports: [NgIcon, HlmButton, HlmCard, HlmCardContent, HlmInput, HlmLabel],
  providers: [provideIcons({ lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-code-form.html'
})
export class ReceiveCodeFormComponent {
  readonly connect = output<string>();

  protected readonly value = signal('');
  protected readonly parsed = computed(() => parseReceiveCode(this.value()));
  protected readonly isValid = computed(() => this.parsed() !== null);
  protected readonly isInvalid = computed(
    () => this.value().length > 0 && !this.isValid()
  );

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const parsed = this.parsed();
    if (!parsed) return;
    this.connect.emit(`${parsed.roomId}-${parsed.password}`);
  }
}
