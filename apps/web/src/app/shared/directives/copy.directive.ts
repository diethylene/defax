import { DestroyRef, Directive, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, from } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Directive that writes its bound value to the clipboard and shows a brief confirmation. */
@Directive({
  selector: '[appCopy]',
  host: { '(click)': 'copy()' },
})
export class CopyDirective {
  /** Text written to the clipboard when the host is clicked. */
  readonly value = input.required<string>();

  /** Whether the copied confirmation is currently shown. */
  private readonly copiedState = signal(false);
  /** Read-only view of the copied confirmation state. */
  readonly copied = this.copiedState.asReadonly();

  /** Tear-down scope that cancels the confirmation when the host is destroyed. */
  private readonly destroyRef = inject(DestroyRef);
  /** Pending timer that hides the copied confirmation. */
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Writes the bound value to the clipboard and briefly shows the confirmation. */
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

  /** Clears the pending confirmation timer when the host is destroyed. */
  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
  }
}
