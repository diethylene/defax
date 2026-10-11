import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-relay-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">works!</p>'
})
export class RelayHelpFeature {}
