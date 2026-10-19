import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { ReceiveCodeFormComponent } from './receive-code-form';

function render(): {
  fixture: ComponentFixture<ReceiveCodeFormComponent>;
  element: HTMLElement;
} {
  const fixture = TestBed.createComponent(ReceiveCodeFormComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

function setCode(element: HTMLElement, value: string): void {
  const input = element.querySelector('input') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ReceiveCodeFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiveCodeFormComponent],
      providers: [provideIcons({ lucideCheck })]
    }).compileComponents();
  });

  it('disables connect until the code is valid', () => {
    const { element } = render();
    const button = element.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows an error for a non-empty invalid code', () => {
    const { fixture, element } = render();
    setCode(element, '12345-apple-orca');
    fixture.detectChanges();
    expect(element.querySelector('p')?.textContent).toContain(
      "doesn't look right"
    );
    expect(
      (element.querySelector('button') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (element.querySelector('input') as HTMLInputElement).getAttribute(
        'aria-invalid'
      )
    ).toBe('true');
  });

  it('enables connect and shows a check for a valid code', () => {
    const { fixture, element } = render();
    setCode(element, '123456-apple-orca');
    fixture.detectChanges();
    expect(
      (element.querySelector('button') as HTMLButtonElement).disabled
    ).toBe(false);
    expect(element.querySelector('ng-icon')).toBeTruthy();
    expect(element.querySelector('p')).toBeNull();
    expect(
      (element.querySelector('input') as HTMLInputElement).className
    ).toContain('border-success');
  });

  it('emits the normalized code on submit', () => {
    const { fixture, element } = render();
    let emitted: string | null = null;
    fixture.componentInstance.connect.subscribe((code) => (emitted = code));
    setCode(element, ' 123456 Apple ORCA ');
    fixture.detectChanges();
    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(emitted).toBe('123456-apple-orca');
  });
});
