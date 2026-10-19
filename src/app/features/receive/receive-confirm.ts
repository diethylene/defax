import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-confirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Check the details</p>'
})
export class ReceiveConfirmComponent {}
