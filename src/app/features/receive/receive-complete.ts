import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive-complete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Complete</p>'
})
export class ReceiveCompleteComponent {}
