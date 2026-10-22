import {
  animate,
  group,
  type AnimationEvent as NgAnimationEvent,
  query,
  style,
  transition,
  trigger
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
  viewChild
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideUpload, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { match } from 'ts-pattern';
import { DropzoneDirective } from './dropzone.directive';
import { computeDrops } from './dropzone-drops';

const baseContainer =
  'relative flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center outline-none sm:p-8';

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const DRAG_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

const selectAnimation = trigger('selectAnim', [
  transition('idle => selected', [
    group([
      query('.content-base', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(
          `280ms 320ms ${EASE_OUT}`,
          style({ opacity: 0, transform: 'translateY(-8px)' })
        )
      ]),
      query('.content-selected', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          `280ms 320ms ${EASE_OUT}`,
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      query(
        '.button-choose',
        [
          style({ opacity: 1, transform: 'translateY(0)' }),
          animate(
            `280ms 380ms ${EASE_OUT}`,
            style({ opacity: 0, transform: 'translateY(-6px)' })
          )
        ],
        { optional: true }
      ),
      query('.button-clear', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate(
          `280ms 380ms ${EASE_OUT}`,
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ])
  ]),
  transition('selected => idle', [
    group([
      query('.content-base', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate(
          `280ms ${EASE_OUT}`,
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      query('.content-selected', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(
          `280ms ${EASE_OUT}`,
          style({ opacity: 0, transform: 'translateY(8px)' })
        )
      ]),
      query(
        '.button-choose',
        [
          style({ opacity: 0, transform: 'translateY(-6px)' }),
          animate(
            `280ms ${EASE_OUT}`,
            style({ opacity: 1, transform: 'translateY(0)' })
          )
        ],
        { optional: true }
      ),
      query('.button-clear', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(
          `280ms ${EASE_OUT}`,
          style({ opacity: 0, transform: 'translateY(6px)' })
        )
      ])
    ])
  ])
]);

const frameAnimation = trigger('frameAnim', [
  transition('idle => drag', [
    animate(
      `200ms 80ms ${DRAG_EASE}`,
      style({ borderColor: '*', backgroundColor: '*', boxShadow: '*' })
    )
  ]),
  transition('drag => idle', [
    animate(
      `200ms ${DRAG_EASE}`,
      style({ borderColor: '*', backgroundColor: '*', boxShadow: '*' })
    )
  ]),
  transition('selected => drag', [
    animate(
      `200ms 80ms ${DRAG_EASE}`,
      style({ borderColor: '*', backgroundColor: '*', boxShadow: '*' })
    )
  ]),
  transition('drag => selected', [
    animate(
      `200ms ${DRAG_EASE}`,
      style({ borderColor: '*', backgroundColor: '*', boxShadow: '*' })
    )
  ]),
  transition('idle => selected', [
    style({
      borderColor: 'var(--foreground)',
      backgroundColor: 'var(--muted)',
      boxShadow: 'none'
    }),
    animate(
      `500ms 320ms ${EASE_OUT}`,
      style({ borderColor: '*', backgroundColor: '*', boxShadow: '*' })
    )
  ])
]);

@Component({
  selector: 'app-dropzone',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideCircleCheck, lucideUpload, lucideX })],
  animations: [selectAnimation, frameAnimation],
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

  readonly settled = output<void>();

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

  protected readonly reduceMotion = signal(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  private readonly rejectionFlash = signal(false);

  private readonly dropsLayer =
    viewChild<ElementRef<HTMLElement>>('dropsLayer');
  private readonly layerSize = signal({ width: 0, height: 0, radius: 0 });

  protected readonly animState = computed(() =>
    this.isSelectedView() ? 'selected' : 'idle'
  );

  protected readonly frameState = computed(() =>
    this.isDragging() ? 'drag' : this.isSelectedView() ? 'selected' : 'idle'
  );

  protected readonly drops = computed(() => {
    const { width, height, radius } = this.layerSize();
    return computeDrops(width, height, radius);
  });

  protected readonly dropColor = computed(() =>
    this.dragState() === 'invalid' ? 'var(--destructive)' : 'var(--foreground)'
  );

  protected readonly containerClasses = computed(() => {
    const classes = match(this.phase())
      .with('disabled', () => `${baseContainer} pointer-events-none opacity-50`)
      .with('drag-over', () => this.dragOverClasses())
      .with(
        'picker-open',
        () =>
          `${baseContainer} border border-primary ring-1 ring-inset ring-primary`
      )
      .with('idle', () => this.idleClasses())
      .exhaustive();
    return this.rejectionFlash() ? `${classes} rejection-flash` : classes;
  });

  protected readonly isSelectedView = computed(
    () => this.files().length > 0 && this.phase() === 'idle'
  );

  protected readonly showCheckIcon = computed(
    () => this.files().length > 0 && this.phase() !== 'drag-over'
  );

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

  protected readonly selectedLabel = computed(() => {
    const count = this.files().length;
    return `${count} ${count === 1 ? 'file' : 'files'} selected`;
  });

  protected readonly selectedFiles = computed(() =>
    this.files()
      .map((file) => file.name)
      .join(', ')
  );

  protected readonly heading = computed(() =>
    this.phase() === 'drag-over' ? this.dropTitle() : this.title()
  );

  protected readonly showChooseButton = computed(
    () => !this.dropzone.noClick()
  );

  protected readonly isDragging = computed(() => this.phase() === 'drag-over');

  protected readonly showDrops = computed(
    () => this.isDragging() && this.dragState() !== 'invalid'
  );

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

  ngAfterViewInit(): void {
    this.observeDropsLayer();
  }

  private dragOverClasses(): string {
    return match(this.dragState())
      .with(
        'invalid',
        () =>
          `${baseContainer} border border-destructive ring-1 ring-inset ring-destructive bg-destructive/5 invalid-strobe`
      )
      .otherwise(
        () =>
          `${baseContainer} border border-foreground ring-1 ring-inset ring-foreground bg-muted`
      );
  }

  private isDraggingValid(): boolean {
    return this.phase() === 'drag-over' && this.dragState() !== 'invalid';
  }

  private idleClasses(): string {
    return this.isSelectedView()
      ? `${baseContainer} border border-success bg-success/15 ring-1 ring-inset ring-success`
      : `${baseContainer} border border-dashed border-neutral-300`;
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.dropzone.clear();
  }

  protected onSelectAnimDone(event: NgAnimationEvent): void {
    if (event.toState === 'selected') {
      this.settled.emit();
    }
  }

  protected onRejectionFlashEnd(event: AnimationEvent): void {
    if (event.pseudoElement === '::before') {
      this.rejectionFlash.set(false);
    }
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
