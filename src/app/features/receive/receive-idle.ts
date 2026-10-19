import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-idle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Receive</p>'
})
export class ReceiveIdleComponent {}
