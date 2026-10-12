import type { ControlValueAccessor } from '@angular/forms';

/**
 * Minimal base class for a single-value form control. Subclasses own their
 * value representation and push new values to the form with `commit` and
 * report interaction with `markTouched`.
 */
export abstract class AbstractControlValueAccessor<T>
  implements ControlValueAccessor
{
  protected value: T | null = null;

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(_isDisabled: boolean): void {
    // Subclasses track disabled state when they need it.
  }

  protected commit(value: T | null): void {
    this.value = value;
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
  }
}
