import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CopyButtonComponent } from '../../shared/components/copy-button/copy-button';

@Component({
  selector: 'app-send-code-field',
  imports: [CopyButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-between gap-3 rounded-lg border border-input bg-muted/50 px-3 py-2"
    >
      <span class="font-mono text-base tracking-widest text-foreground">{{
        code()
      }}</span>
      <app-copy-button [value]="code()" />
    </div>
  `
})
export class SendCodeFieldComponent {
  readonly code = input.required<string>();
}
