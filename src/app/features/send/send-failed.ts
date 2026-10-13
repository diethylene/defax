import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send-failed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Transfer failed</p>'
})
export class SendFailedComponent {}
