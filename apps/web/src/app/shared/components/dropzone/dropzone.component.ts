import {
  animate,
  group,
  type AnimationEvent as NgAnimationEvent,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideUpload, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import * as Match from 'effect/Match';
import { DropzoneDirective } from './dropzone.directive';
import { computeDrops } from './dropzone-drops.util';

/** Base classes for the dropzone frame. */
const baseContainer =
  'dropzone-frame relative flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center outline-none sm:p-8';

/** Easing used by the selection animation. */
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Animates the switch between the idle and selected views. */
const selectAnimation = trigger('selectAnim', [
  transition('idle => selected', [
    group([
      query('.content-base', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(`280ms 320ms ${EASE_OUT}`, style({ opacity: 0, transform: 'translateY(-8px)' })),
      ]),
      query('.content-selected', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(`280ms 320ms ${EASE_OUT}`, style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      query(
        '.button-choose',
        [
          style({ opacity: 1, transform: 'translateY(0)' }),
          animate(`280ms 380ms ${EASE_OUT}`, style({ opacity: 0, transform: 'translateY(-6px)' })),
        ],
        { optional: true },
      ),
      query('.button-clear', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate(`280ms 380ms ${EASE_OUT}`, style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ]),
  transition('selected => idle', [
    group([
      query('.content-base', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate(`280ms ${EASE_OUT}`, style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      query('.content-selected', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(`280ms ${EASE_OUT}`, style({ opacity: 0, transform: 'translateY(8px)' })),
      ]),
      query(
        '.button-choose',
        [
          style({ opacity: 0, transform: 'translateY(-6px)' }),
          animate(`280ms ${EASE_OUT}`, style({ opacity: 1, transform: 'translateY(0)' })),
        ],
        { optional: true },
      ),
      query('.button-clear', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(`280ms ${EASE_OUT}`, style({ opacity: 0, transform: 'translateY(6px)' })),
      ]),
    ]),
  ]),
]);

/** Drag-and-drop surface with falling drops and a selected-file view. */
@Component({
  selector: 'app-dropzone',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideCircleCheck, lucideUpload, lucideX })],
  animations: [selectAnimation],
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
        'disabled',
      ],
      outputs: ['filesChange', 'dragStateChange', 'pickerStateChange'],
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dropzone.component.html',
  styleUrls: ['./dropzone.component.css'],
})
export class DropzoneComponent {
  /** Host directive that owns the selection and interaction state. */
  readonly dropzone = inject(DropzoneDirective, { host: true });
  /** Used to disconnect the resize observer. */
  private readonly destroyRef = inject(DestroyRef);

  /** Emits after the selected view finishes its entrance. */
  readonly settled = output<void>();

  /** Heading shown while idle. */
  readonly title = input('Drag and drop a file here');
  /** Supporting text shown while idle. */
  readonly subtitle = input(
    'One file at a time. It stays on this device until the receiver accepts it.',
  );
  /** Heading shown while a drag is over the dropzone. */
  readonly dropTitle = input('Drop to send');
  /** Label of the choose button. */
  readonly buttonLabel = input('Choose a file');

  /** Current interaction with the disabled flag applied. */
  protected readonly phase = this.dropzone.phase;
  /** Current drag state. */
  protected readonly dragState = this.dropzone.dragState;
  /** Currently selected files. */
  protected readonly files = this.dropzone.files;
  /** Rejections from the last selection, or null when clean. */
  protected readonly error = this.dropzone.error;

  /** Whether the user prefers reduced motion. */
  protected readonly reduceMotion = signal(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  /** Whether the rejection flash should play. */
  private readonly rejectionFlash = signal(false);

  /** Layer that hosts the falling drops. */
  private readonly dropsLayer = viewChild<ElementRef<HTMLElement>>('dropsLayer');
  /** Size and corner radius of the drops layer. */
  private readonly layerSize = signal({ width: 0, height: 0, radius: 0 });

  /** Animation state derived from the current view. */
  protected readonly animState = computed(() => (this.isSelectedView() ? 'selected' : 'idle'));

  /** Falling drops placed around the current layer. */
  protected readonly drops = computed(() => {
    const { width, height, radius } = this.layerSize();
    return computeDrops(width, height, radius);
  });

  /** Colour of the falling drops. */
  protected readonly dropColor = computed(() =>
    this.dragState() === 'invalid' ? 'var(--destructive)' : 'var(--foreground)',
  );

  /** Frame classes for the current phase and rejection flash. */
  protected readonly containerClasses = computed(() => {
    const classes = Match.value(this.phase()).pipe(
      Match.when('disabled', () => `${baseContainer} pointer-events-none opacity-50`),
      Match.when('drag-over', () => this.dragOverClasses()),
      Match.when(
        'picker-open',
        () => `${baseContainer} border border-primary ring-1 ring-inset ring-primary`,
      ),
      Match.when('idle', () => this.idleClasses()),
      Match.exhaustive,
    );
    return this.rejectionFlash() ? `${classes} rejection-flash` : classes;
  });

  /** Whether the selected-file view is showing. */
  protected readonly isSelectedView = computed(
    () => this.files().length > 0 && this.phase() === 'idle',
  );

  /** Whether the check icon replaces the upload icon. */
  protected readonly showCheckIcon = computed(
    () => this.files().length > 0 && this.phase() !== 'drag-over',
  );

  /** Classes for the icon box. */
  protected readonly iconBoxClasses = computed(() => {
    const base =
      'flex size-10 items-center justify-center transition-[background-color,border-radius,color] duration-200 ease-out';
    if (this.showCheckIcon()) {
      return `${base} rounded-[20px] bg-success text-success-foreground`;
    }
    if (this.isDraggingValid()) {
      return `${base} rounded-[10px] bg-foreground text-background`;
    }
    return `${base} rounded-[10px] bg-muted text-foreground`;
  });

  /** Heading for the selected-file count. */
  protected readonly selectedLabel = computed(() => {
    const count = this.files().length;
    return `${count} ${count === 1 ? 'file' : 'files'} selected`;
  });

  /** Comma-separated names of the selected files. */
  protected readonly selectedFiles = computed(() =>
    this.files()
      .map((file) => file.name)
      .join(', '),
  );

  /** Heading for the current phase. */
  protected readonly heading = computed(() =>
    this.phase() === 'drag-over' ? this.dropTitle() : this.title(),
  );

  /** Whether the choose button is rendered. */
  protected readonly showChooseButton = computed(() => !this.dropzone.noClick());

  /** Whether a drag is over the dropzone. */
  protected readonly isDragging = computed(() => this.phase() === 'drag-over');

  /** Whether the falling drops are visible. */
  protected readonly showDrops = computed(
    () => this.isDragging() && this.dragState() !== 'invalid',
  );

  /** Starts the rejection flash and reduced-motion effects. */
  constructor() {
    effect(() => {
      if (this.error() !== null) {
        this.rejectionFlash.set(true);
      }
    });

    effect(() => {
      if (this.reduceMotion() && this.isSelectedView()) {
        this.settled.emit();
      }
    });
  }

  /** Starts observing the drops layer once the view exists. */
  ngAfterViewInit(): void {
    this.observeDropsLayer();
  }

  /**
   * Frame classes while a drag is over the dropzone.
   * @returns Class list for the current drag state.
   */
  private dragOverClasses(): string {
    return Match.value(this.dragState()).pipe(
      Match.when(
        'invalid',
        () =>
          `${baseContainer} border border-destructive ring-1 ring-inset ring-destructive bg-destructive/5 invalid-strobe`,
      ),
      Match.orElse(
        () =>
          `${baseContainer} border border-foreground ring-1 ring-inset ring-foreground bg-muted`,
      ),
    );
  }

  /**
   * Tells whether a drag is valid.
   * @returns True for a drag over the dropzone in a valid state.
   */
  private isDraggingValid(): boolean {
    return this.phase() === 'drag-over' && this.dragState() !== 'invalid';
  }

  /**
   * Frame classes for the idle phase.
   * @returns Class list for the idle or selected state.
   */
  private idleClasses(): string {
    return this.isSelectedView()
      ? `${baseContainer} border border-success bg-success/15 ring-1 ring-inset ring-success`
      : `${baseContainer} border border-dashed border-neutral-300`;
  }

  /**
   * Clears the selection.
   * @param event Click event from the clear button.
   */
  protected clear(event: Event): void {
    event.stopPropagation();
    this.dropzone.clear();
  }

  /**
   * Emits settled when the selected view finishes entering.
   * @param event Animation event from the selection trigger.
   */
  protected onSelectAnimDone(event: NgAnimationEvent): void {
    if (event.toState === 'selected') {
      this.settled.emit();
    }
  }

  /**
   * Ends the rejection flash when its animation finishes.
   * @param event Animation event from the frame.
   */
  protected onRejectionFlashEnd(event: AnimationEvent): void {
    if (event.pseudoElement === '::before') {
      this.rejectionFlash.set(false);
    }
  }

  /** Tracks the drops layer size so the drops can be laid out. */
  private observeDropsLayer(): void {
    const layer = this.dropsLayer()?.nativeElement;
    if (!layer) return;

    /** Measures the drops layer. */
    const update = (): void => {
      this.layerSize.set({
        width: layer.clientWidth,
        height: layer.clientHeight,
        radius: 8,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(layer);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
