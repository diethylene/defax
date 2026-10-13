import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send-approve',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Confirm the code</p>'
})
export class SendApproveComponent {}
