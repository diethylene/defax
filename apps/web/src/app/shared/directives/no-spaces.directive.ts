import { Directive, ElementRef, inject } from '@angular/core';

/** Directive that blocks space keys and strips spaces from pasted text in its input host. */
@Directive({
  selector: 'input[appNoSpaces]',
  host: { '(keydown)': 'onKeydown($event)', '(paste)': 'onPaste($event)' },
})
export class NoSpacesDirective {
  /** The input element the directive is attached to. */
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /**
   * Cancels the space key so it enters no character.
   * @param event The keydown event from the host input.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ') return;
    event.preventDefault();
  }

  /**
   * Inserts the pasted text with spaces stripped at the current selection.
   * @param event The paste event from the host input, whose native insert is cancelled.
   */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text/plain') ?? '').replaceAll(' ', '');
    const input = this.host.nativeElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.setRangeText(pasted, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
