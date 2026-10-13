import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Awaiting peer</p>'
})
export class SendCodeComponent {}
