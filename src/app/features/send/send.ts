import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DropzoneComponent } from '../../shared/components/dropzone/dropzone.component';

@Component({
  selector: 'app-send',
  imports: [DropzoneComponent],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send.html'
})
export class SendFeature {}
