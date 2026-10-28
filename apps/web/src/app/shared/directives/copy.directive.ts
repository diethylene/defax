import { DestroyRef, Directive, inject, input, signal } from '@angular/core';

const COPIED_RESET_MS = 2000;

@Directive({
  selector: '[appCopy]',
  host: { '(click)': 'copy()' },
})
export class CopyDirective {
  readonly value = input.required<string>();

  private readonly copiedState = signal(false);
  readonly copied = this.copiedState.asReadonly();

  private readonly destroyRef = inject(DestroyRef);
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  copy(): void {
    navigator.clipboard
      .writeText(this.value())
      .then(() => {
        this.copiedState.set(true);
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => this.copiedState.set(false), COPIED_RESET_MS);
      })
      .catch(() => undefined);
  }

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
  }
}
