import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Wraps the child routes of the receive flow. */
@Component({
  selector: 'app-receive-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page-transition"><router-outlet /></div>'
})
export class ReceiveLayoutComponent {}
