import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Wraps the child routes of the send flow. */
@Component({
  selector: 'app-send-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page-transition"><router-outlet /></div>'
})
export class SendLayoutComponent {}
