import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder page explaining relayed transfers. */
@Component({
  selector: 'app-relay-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">works!</p>',
})
export class RelayHelpComponent {}
