import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUpload } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { match } from 'ts-pattern';
import { DropzoneDirective } from './dropzone.directive';
import { computeDrops } from './dropzone-drops';

const baseContainer =
  'relative flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center outline-none transition-colors sm:p-8';

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
  templateUrl: './dropzone.component.html',
  styleUrls: ['./dropzone.component.css']
})
export class DropzoneComponent {
  readonly dropzone = inject(DropzoneDirective, { host: true });
  private readonly destroyRef = inject(DestroyRef);

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

  private readonly dropsLayer =
    viewChild<ElementRef<HTMLElement>>('dropsLayer');
  private readonly layerSize = signal({ width: 0, height: 0, radius: 0 });

  protected readonly drops = computed(() => {
    const { width, height, radius } = this.layerSize();
    return computeDrops(width, height, radius);
  });

  protected readonly dropColor = computed(() =>
    this.dragState() === 'invalid' ? 'var(--destructive)' : 'var(--foreground)'
  );

  protected readonly containerClasses = computed(() =>
    match(this.phase())
      .with('disabled', () => `${baseContainer} pointer-events-none opacity-50`)
      .with('drag-over', () => this.dragOverClasses())
      .with(
        'picker-open',
        () =>
          `${baseContainer} border border-primary ring-1 ring-inset ring-primary`
      )
      .with(
        'idle',
        () => `${baseContainer} border border-dashed border-neutral-300`
      )
      .exhaustive()
  );

  protected readonly iconBoxClasses = computed(() => {
    const base = 'flex size-10 items-center justify-center rounded-[10px]';
    return this.isDraggingValid()
      ? `${base} bg-foreground text-background`
      : `${base} bg-muted text-foreground`;
  });

  protected readonly heading = computed(() =>
    this.phase() === 'drag-over' ? this.dropTitle() : this.title()
  );

  protected readonly showButton = computed(() => !this.dropzone.noClick());

  protected readonly isDragging = computed(() => this.phase() === 'drag-over');

  ngAfterViewInit(): void {
    this.observeDropsLayer();
  }

  private dragOverClasses(): string {
    return match(this.dragState())
      .with(
        'invalid',
        () =>
          `${baseContainer} border border-destructive ring-1 ring-inset ring-destructive bg-destructive/5`
      )
      .otherwise(
        () =>
          `${baseContainer} border border-foreground ring-1 ring-inset ring-foreground bg-muted`
      );
  }

  private isDraggingValid(): boolean {
    return this.phase() === 'drag-over' && this.dragState() !== 'invalid';
  }

  private observeDropsLayer(): void {
    const layer = this.dropsLayer()?.nativeElement;
    if (!layer) return;

    const update = (): void => {
      this.layerSize.set({
        width: layer.clientWidth,
        height: layer.clientHeight,
        radius: 8
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(layer);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
