import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUpload } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { match } from 'ts-pattern';
import { DropzoneDirective } from './dropzone.directive';

const baseContainer =
  'flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center outline-none transition-colors sm:p-8';

@Component({
  selector: 'app-dropzone',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideUpload })],
  hostDirectives: [
    {
      directive: DropzoneDirective,
      inputs: [
        'accept',
        'multiple',
        'maxFiles',
        'maxFileSize',
        'minFileSize',
        'maxTotalSize',
        'validator',
        'rejectionMode',
        'noClick',
        'noKeyboard',
        'disabled'
      ],
      outputs: ['filesChange', 'dragStateChange', 'pickerStateChange']
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dropzone.component.html'
})
export class DropzoneComponent {
  readonly dropzone = inject(DropzoneDirective, { host: true });

  readonly title = input('Drag and drop a file here');
  readonly subtitle = input(
    'One file at a time. It stays on this device until the receiver accepts it.'
  );
  readonly dropTitle = input('Drop to send');
  readonly buttonLabel = input('Choose a file');

  protected readonly phase = this.dropzone.phase;
  protected readonly dragState = this.dropzone.dragState;
  protected readonly files = this.dropzone.files;
  protected readonly error = this.dropzone.error;

  protected readonly containerClasses = computed(() =>
    match(this.phase())
      .with('disabled', () => `${baseContainer} pointer-events-none opacity-50`)
      .with('drag-over', () => this.dragOverClasses())
      .with('picker-open', () => `${baseContainer} border-2 border-primary`)
      .with(
        'idle',
        () => `${baseContainer} border border-dashed border-neutral-300`
      )
      .exhaustive()
  );

  protected readonly iconBoxClasses = computed(() => {
    const base = 'flex size-10 items-center justify-center rounded-[10px]';
    return this.isDraggingValid()
      ? `${base} bg-neutral-900 text-neutral-100`
      : `${base} bg-neutral-100 text-neutral-900`;
  });

  protected readonly heading = computed(() =>
    this.phase() === 'drag-over' ? this.dropTitle() : this.title()
  );

  protected readonly showButton = computed(() => !this.dropzone.noClick());

  private dragOverClasses(): string {
    return match(this.dragState())
      .with(
        'invalid',
        () => `${baseContainer} border-2 border-destructive bg-destructive/5`
      )
      .otherwise(
        () => `${baseContainer} border-2 border-neutral-900 bg-neutral-100`
      );
  }

  private isDraggingValid(): boolean {
    return this.phase() === 'drag-over' && this.dragState() !== 'invalid';
  }
}
