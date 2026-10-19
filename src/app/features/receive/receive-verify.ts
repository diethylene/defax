import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Verifying</p>'
})
export class ReceiveVerifyComponent {}
