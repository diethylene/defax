import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-receive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Receive works!</p>'
})
export class ReceiveFeature {}
