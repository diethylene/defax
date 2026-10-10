import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-6 text-foreground">Help works!</p>'
})
export class HelpFeature {}
