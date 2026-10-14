import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { DropzoneComponent } from '../../shared/components/dropzone/dropzone.component';
import type { DropzoneResult } from '../../shared/components/dropzone/dropzone.model';
import { sendFileSelected } from '../../store/actions/send.actions';
import { toFileMetadata } from './file-metadata';

@Component({
  selector: 'app-send-idle',
  imports: [DropzoneComponent, HlmBadge],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-idle.html'
})
export class SendIdleComponent {
  private readonly store = inject(Store);
  private pendingFile: File | null = null;

  onFilesChange(result: DropzoneResult): void {
    this.pendingFile = result.accepted[0] ?? null;
  }

  onSettled(): void {
    const file = this.pendingFile;
    if (!file) return;
    this.pendingFile = null;
    this.store.dispatch(
      sendFileSelected({ file, metadata: toFileMetadata(file) })
    );
  }
}
