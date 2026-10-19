import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-transfer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Receiving</p>'
})
export class ReceiveTransferComponent {}
