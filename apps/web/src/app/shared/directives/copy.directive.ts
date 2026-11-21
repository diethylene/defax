import { DestroyRef, Directive, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, from } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    from(navigator.clipboard.writeText(this.value()))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => EMPTY),
      )
      .subscribe(() => {
        this.copiedState.set(true);
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => this.copiedState.set(false), environment.ui.copiedReset);
      });
  }

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
  }
}
