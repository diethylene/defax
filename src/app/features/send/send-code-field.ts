import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyCodeButtonComponent } from '../../shared/components/copy-code-button/copy-code-button';

@Component({
  selector: 'app-send-code-field',
  imports: [CopyCodeButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-between gap-3 rounded-lg border border-input bg-muted/50 px-3 py-2"
    >
      <span class="font-mono text-base tracking-widest text-foreground">{{
        code()
      }}</span>
      <app-copy-code-button [value]="code()" />
    </div>
  `
})
export class SendCodeFieldComponent {
  readonly code = input.required<string>();
}
