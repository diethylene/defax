import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  PageShellComponent,
  type PageStep
} from '../../../core/components/page-shell/page-shell';
import { DropzoneComponent } from '../../../shared/components/dropzone/dropzone.component';
import type { DropzoneResult } from '../../../shared/components/dropzone/dropzone.model';
import { sendFileSelected } from '../../../store/actions/send.actions';
import { toFileMetadata } from '../file-metadata/file-metadata';

@Component({
  selector: 'app-send-idle',
  imports: [PageShellComponent, DropzoneComponent],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-idle.html'
})
export class SendIdleComponent {
  private readonly store = inject(Store);
  private pendingFile: File | null = null;

  protected readonly steps: PageStep[] = [
    { title: 'Choose a file.', description: 'You get a one-time code.' },
    {
      title: 'Share the code.',
      description: 'Tell the receiver however you like.'
    },
    {
      title: 'They accept.',
      description: "The file transfers directly, encrypted. That's it."
    }
  ];

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
