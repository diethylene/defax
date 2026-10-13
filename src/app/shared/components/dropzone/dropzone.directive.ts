import { DOCUMENT } from '@angular/common';
import {
  computed,
  Directive,
  ElementRef,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ValidationErrors,
  type Validator
} from '@angular/forms';
import {
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  Subject,
  scan,
  takeUntil
} from 'rxjs';
import { match } from 'ts-pattern';
import { AbstractControlValueAccessor } from '../../abstractions/control-value-accessor';
import { parseDropzoneConfig } from './dropzone.config';
import type {
  DragState,
  DropzoneRejectionMode,
  DropzoneResult,
  DropzoneValidator
} from './dropzone.model';
import { DropzoneStore } from './dropzone.store';
import { evaluateFiles } from './dropzone.validator';
import { matchesMimeType } from './dropzone-accept';

interface ExtractedDrop {
  files: File[];
  directories: File[];
}

type DragDelta = { kind: 'enter' } | { kind: 'leave' } | { kind: 'reset' };

const EMPTY_DROP: ExtractedDrop = { files: [], directories: [] };

function classifyDropItem(item: DataTransferItem): ExtractedDrop {
  const entry = item.webkitGetAsEntry();
  if (entry?.isDirectory) {
    return { files: [], directories: [new File([], entry.name, { type: '' })] };
  }
  const file = item.getAsFile();
  return file ? { files: [file], directories: [] } : EMPTY_DROP;
}

function extractDrop(dataTransfer: DataTransfer | null): ExtractedDrop {
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
  if (items.length === 0) {
    return { files: Array.from(dataTransfer?.files ?? []), directories: [] };
  }
  const classified = items.map(classifyDropItem);
  return {
    files: classified.flatMap((part) => part.files),
    directories: classified.flatMap((part) => part.directories)
  };
}

function reduceDepth(depth: number, delta: DragDelta): number {
  return match(delta.kind)
    .with('enter', () => depth + 1)
    .with('leave', () => Math.max(0, depth - 1))
    .with('reset', () => 0)
    .exhaustive();
}

function dragStateFor(
  transfer: DataTransfer | null,
  accept: string[]
): DragState {
  const types = transfer ? Array.from(transfer.types) : [];
  if (!types.includes('Files')) return 'invalid';
  if (accept.length === 0) return 'valid';
  const known = Array.from(transfer?.items ?? [])
    .map((item) => item.type)
    .filter((type) => type.length > 0);
  if (known.length === 0) return 'unknown';
  if (known.every((type) => matchesMimeType(type, accept))) return 'valid';
  if (known.some((type) => !matchesMimeType(type, accept))) return 'invalid';
  return 'unknown';
}

@Directive({
  selector: '[appDropzone]',
  exportAs: 'appDropzone',
  providers: [
    DropzoneStore,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropzoneDirective),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DropzoneDirective),
      multi: true
    }
  ]
})
export class DropzoneDirective
  extends AbstractControlValueAccessor<File[]>
  implements Validator
{
  readonly store = inject(DropzoneStore);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly destroy$ = new Subject<void>();

  readonly accept = input<string | string[]>([]);
  readonly multiple = input(false);
  readonly maxFiles = input<number | null>(null);
  readonly maxFileSize = input<number | null>(null);
  readonly minFileSize = input(0);
  readonly maxTotalSize = input<number | null>(null);
  readonly validator = input<DropzoneValidator | null>(null);
  readonly rejectionMode = input<DropzoneRejectionMode>('partial');
  readonly noClick = input(false);
  readonly noKeyboard = input(false);
  readonly disabled = input(false);

  readonly filesChange = output<DropzoneResult>();
  readonly dragStateChange = output<DragState>();
  readonly pickerStateChange = output<boolean>();

  readonly phase = this.store.phase;
  readonly dragState = this.store.dragState;
  readonly files = this.store.files;
  readonly error = this.store.error;
  readonly isDisabled = this.store.disabled;

  private readonly formDisabled = signal(false);
  private readonly fileInput: HTMLInputElement;
  private onValidatorChange: (() => void) | null = null;

  private readonly config = computed(() =>
    parseDropzoneConfig({
      accept: this.accept(),
      multiple: this.multiple(),
      maxFiles: this.maxFiles(),
      maxFileSize: this.maxFileSize(),
      minFileSize: this.minFileSize(),
      maxTotalSize: this.maxTotalSize(),
      validator: this.validator(),
      rejectionMode: this.rejectionMode(),
      noClick: this.noClick(),
      noKeyboard: this.noKeyboard(),
      disabled: this.disabled()
    })
  );

  constructor() {
    super();
    this.fileInput = this.document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.hidden = true;
    this.elementRef.nativeElement.appendChild(this.fileInput);
    this.elementRef.nativeElement.setAttribute('role', 'button');

    effect(() =>
      this.store.setDisabled(this.config().disabled || this.formDisabled())
    );
    effect(() => this.syncAccessibility());

    this.bindDragEvents();
    this.bindActivationEvents();
    this.bindPickerEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.fileInput.remove();
  }

  override writeValue(value: File[] | null): void {
    super.writeValue(value);
    this.store.setFiles(value ?? []);
    this.store.clearError();
    this.onValidatorChange?.();
  }

  override setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  validate(): ValidationErrors | null {
    const error = this.store.error();
    if (error && error.length > 0) {
      return {
        dropzone: error.map((rejection) => ({
          name: rejection.file.name,
          reasons: rejection.reasons
        }))
      };
    }
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  openPicker(): void {
    if (this.isDisabled()) return;
    const config = this.config();
    this.fileInput.accept = config.accept.join(',');
    this.fileInput.multiple = config.multiple;
    this.fileInput.value = '';
    this.fileInput.click();
    this.store.setInteraction('picker-open');
    this.pickerStateChange.emit(true);
  }

  clear(): void {
    this.store.clearFiles();
    this.commit([]);
    this.filesChange.emit({ accepted: [], rejected: [] });
    this.onValidatorChange?.();
  }

  private bindDragEvents(): void {
    const element = this.elementRef.nativeElement;
    const enter$ = fromEvent<DragEvent>(element, 'dragenter');
    const over$ = fromEvent<DragEvent>(element, 'dragover');
    const leave$ = fromEvent<DragEvent>(element, 'dragleave');
    const drop$ = fromEvent<DragEvent>(element, 'drop');

    const depth$ = merge(
      enter$.pipe(map(() => ({ kind: 'enter' }) as const)),
      leave$.pipe(map(() => ({ kind: 'leave' }) as const)),
      drop$.pipe(map(() => ({ kind: 'reset' }) as const))
    ).pipe(scan(reduceDepth, 0));

    depth$
      .pipe(
        map((depth) => depth > 0),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((active) => this.onDragActive(active));

    merge(enter$, over$)
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isDisabled()) this.updateDragState(event);
      });

    drop$.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.isDisabled()) return;
      const { files, directories } = extractDrop(event.dataTransfer);
      this.process(files, directories);
    });
  }

  private bindActivationEvents(): void {
    const element = this.elementRef.nativeElement;
    const click$ = fromEvent<MouseEvent>(element, 'click');
    const keydown$ = fromEvent<KeyboardEvent>(element, 'keydown');

    click$
      .pipe(
        filter((event) => event.target !== this.fileInput),
        filter(() => !this.isDisabled() && !this.config().noClick),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.openPicker());

    keydown$
      .pipe(
        filter((event) => event.key === 'Enter' || event.key === ' '),
        filter(() => !this.isDisabled() && !this.config().noKeyboard),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        event.preventDefault();
        this.openPicker();
      });
  }

  private bindPickerEvents(): void {
    fromEvent(this.fileInput, 'change')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const files = Array.from(this.fileInput.files ?? []);
        this.closePicker();
        this.process(files, []);
      });

    fromEvent(this.fileInput, 'cancel')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.closePicker());

    const win = this.document.defaultView;
    if (win) {
      fromEvent(win, 'focus')
        .pipe(
          filter(() => this.store.interaction() === 'picker-open'),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this.closePicker());
    }
  }

  private onDragActive(active: boolean): void {
    if (this.isDisabled()) return;
    this.store.setInteraction(active ? 'drag-over' : 'idle');
    if (!active) this.setDragState(null);
  }

  private updateDragState(event: DragEvent): void {
    this.setDragState(dragStateFor(event.dataTransfer, this.config().accept));
  }

  private setDragState(state: DragState): void {
    this.store.setDragState(state);
    this.dragStateChange.emit(state);
  }

  private closePicker(): void {
    this.store.setInteraction('idle');
    this.pickerStateChange.emit(false);
  }

  private process(files: File[], directories: File[]): void {
    const result = evaluateFiles(
      files,
      directories,
      this.store.files(),
      this.config()
    );
    this.store.applyResult(result);
    this.commit(result.accepted);
    this.filesChange.emit(result);
    this.onValidatorChange?.();
  }

  private syncAccessibility(): void {
    const disabled = this.isDisabled();
    const element = this.elementRef.nativeElement;
    element.setAttribute('aria-disabled', String(disabled));
    element.setAttribute('tabindex', disabled ? '-1' : '0');
  }
}
