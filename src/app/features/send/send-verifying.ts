import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send-verifying',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Verifying</p>'
})
export class SendVerifyingComponent {}
