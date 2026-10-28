import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  PageShellComponent,
  type PageStep
} from '../../../core/components/page-shell/page-shell';
import { DropzoneComponent } from '../../../shared/components/dropzone/dropzone.component';
import type { DropzoneResult } from '../../../shared/components/dropzone/dropzone.model';
import { SendActions } from '../../../store/send/send.actions';
import { toFileMetadata } from '../file-metadata/file-metadata.util';

/** Asks the user to choose a file and starts the send. */
@Component({
  selector: 'app-send-idle',
  imports: [PageShellComponent, DropzoneComponent],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-idle.component.html'
})
export class SendIdleComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** File the dropzone accepted, waiting for the selection animation to settle. */
  private readonly pendingFile = signal<File | undefined>(undefined);

  /** Steps shown beside the dropzone. */
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

  /**
   * Remembers the accepted file until the dropzone settles.
   * @param result Files the dropzone accepted or rejected.
   */
  onFilesChange(result: DropzoneResult): void {
    this.pendingFile.set(result.accepted[0]);
  }

  /** Dispatches the chosen file once the dropzone animation settles. */
  onSettled(): void {
    const file = this.pendingFile();
    if (file === undefined) return;
    this.pendingFile.set(undefined);
    this.store.dispatch(
      SendActions.fileSelected({ file, metadata: toFileMetadata(file) })
    );
  }
}
