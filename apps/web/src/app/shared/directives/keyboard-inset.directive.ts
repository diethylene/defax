import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';

/** Directive that shrinks its host by the on-screen keyboard height so nested scroll containers can overflow. */
@Directive({
  selector: '[appKeyboardInset]',
})
export class KeyboardInsetDirective {
  /** The host element whose height follows the visual viewport. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Tears down the viewport subscriptions with the host. */
  private readonly destroyRef = inject(DestroyRef);

  /** Follows the visual viewport and resets the host height whenever it changes. */
  constructor() {
    const viewport: EventTarget = window.visualViewport ?? window;
    merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.apply());
    this.apply();
  }

  /** Sets the host height to the visible viewport height minus the keyboard. */
  private apply(): void {
    const viewport = window.visualViewport;
    const keyboard = viewport ? Math.max(0, window.innerHeight - viewport.height) : 0;
    this.host.nativeElement.style.height = `calc(100dvh - ${keyboard}px)`;
  }
}
