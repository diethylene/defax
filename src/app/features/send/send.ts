import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-send',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Send works!</p>'
})
export class SendFeature {}
