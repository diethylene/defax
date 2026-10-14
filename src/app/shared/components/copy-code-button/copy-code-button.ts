import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-copy-code-button',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideCopy })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" hlmBtn class="cursor-pointer">
      <ng-icon name="lucideCopy" size="16" />
      Copy code
    </button>
  `
})
export class CopyCodeButtonComponent {
  readonly value = input.required<string>();
}
