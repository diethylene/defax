import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';

/** Directive that reserves the on-screen keyboard height as bottom padding on its host scroll container. */
@Directive({
  selector: '[appKeyboardPadding]',
})
export class KeyboardPaddingDirective {
  /** The host scroll container whose padding follows the visual viewport. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Tears down the viewport subscriptions with the host. */
  private readonly destroyRef = inject(DestroyRef);

  /** Follows the visual viewport and resets the host padding whenever it changes. */
  constructor() {
    const viewport: EventTarget = window.visualViewport ?? window;
    merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.apply());
    this.apply();
  }

  /** Sets the host bottom padding to the keyboard height above the visual viewport. */
  private apply(): void {
    const viewport = window.visualViewport;
    const keyboard = viewport
      ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      : 0;
    this.host.nativeElement.style.paddingBottom = `${keyboard}px`;
  }
}
