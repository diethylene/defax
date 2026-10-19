import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-failed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Transfer failed</p>'
})
export class ReceiveFailedComponent {}
