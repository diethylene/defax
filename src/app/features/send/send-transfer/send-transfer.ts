import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send-transfer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Transferring</p>'
})
export class SendTransferComponent {}
