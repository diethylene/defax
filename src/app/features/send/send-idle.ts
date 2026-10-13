import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { DropzoneComponent } from '../../shared/components/dropzone/dropzone.component';
import type { DropzoneResult } from '../../shared/components/dropzone/dropzone.model';
import { sendFileSelected } from '../../store/actions/send.actions';
import { toFileMetadata } from './file-metadata';

@Component({
  selector: 'app-send-idle',
  imports: [DropzoneComponent],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-idle.html'
})
export class SendIdleComponent {
  private readonly store = inject(Store);

  onFilesChange(result: DropzoneResult): void {
    const file = result.accepted[0];
    if (!file) return;
    this.store.dispatch(
      sendFileSelected({ file, metadata: toFileMetadata(file) })
    );
  }
}
