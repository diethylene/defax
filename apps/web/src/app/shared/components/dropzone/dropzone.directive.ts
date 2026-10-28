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
  signal,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import * as Match from 'effect/Match';
import {
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  Subject,
  scan,
  takeUntil,
} from 'rxjs';
import { AbstractControlValueAccessor } from '../../abstractions/control-value-accessor';
import { parseDropzoneConfig } from './dropzone.config';
import type {
  DragState,
  DropzoneRejectionMode,
  DropzoneResult,
  DropzoneValidator,
} from './dropzone.model';
import { DropzoneStore } from './dropzone.store';
import { matchesMimeType } from './dropzone-accept.util';
import { evaluateFiles } from './dropzone-validator.util';

/** Files and directories pulled out of one data transfer. */
interface ExtractedDrop {
  /** Files in the transfer. */
  files: File[];
  /** Directories in the transfer, represented by placeholder files. */
  directories: File[];
}

/** One drag depth change. */
type DragDelta = { kind: 'enter' } | { kind: 'leave' } | { kind: 'reset' };

/** Empty drop used when an item yields neither files nor directories. */
const EMPTY_DROP: ExtractedDrop = { files: [], directories: [] };

/**
 * Classifies one data transfer item as a file or a directory.
 * @param item Item from the drag data transfer.
 * @returns Extracted file or directory placeholder.
 */
const classifyDropItem = (item: DataTransferItem): ExtractedDrop => {
  const entry = item.webkitGetAsEntry();
  if (entry?.isDirectory) {
    return { files: [], directories: [new File([], entry.name, { type: '' })] };
  }
  const file = item.getAsFile();
  return file ? { files: [file], directories: [] } : EMPTY_DROP;
};

/**
 * Extracts files and directories from a data transfer.
 * @param dataTransfer Transfer from the drop event.
 * @returns Files and directories in the transfer.
 */
const extractDrop = (dataTransfer: DataTransfer | null): ExtractedDrop => {
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
  if (items.length === 0) {
    return { files: Array.from(dataTransfer?.files ?? []), directories: [] };
  }
  const classified = items.map(classifyDropItem);
  return {
    files: classified.flatMap((part) => part.files),
    directories: classified.flatMap((part) => part.directories),
  };
};

/**
 * Applies one drag event to the drag depth.
 * @param depth Current drag depth.
 * @param delta Drag event kind.
 * @returns New drag depth.
 */
const reduceDepth = (depth: number, delta: DragDelta): number =>
  Match.value(delta.kind).pipe(
    Match.when('enter', () => depth + 1),
    Match.when('leave', () => Math.max(0, depth - 1)),
    Match.when('reset', () => 0),
    Match.exhaustive,
  );

/**
 * Infers the drag state from the dragged data.
 * @param transfer Transfer from the drag event.
 * @param accept Normalized accept entries.
 * @returns Whether the drag is valid, invalid, or unknown.
 */
const dragStateFor = (transfer: DataTransfer | null, accept: readonly string[]): DragState => {
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
};

/** Drag-and-drop file picker that binds to a form control. */
@Directive({
  selector: '[appDropzone]',
  exportAs: 'appDropzone',
  providers: [
    DropzoneStore,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropzoneDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DropzoneDirective),
      multi: true,
    },
  ],
})
export class DropzoneDirective extends AbstractControlValueAccessor<File[]> implements Validator {
  /** Store holding the dropzone interaction and files. */
  readonly store = inject(DropzoneStore);
  /** Host element that receives the drag and click events. */
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  /** Document used to create the hidden file input. */
  private readonly document = inject(DOCUMENT);
  /** Emits when the directive is destroyed. */
  private readonly destroy$ = new Subject<void>();

  /** Accepted MIME types or extensions. */
  readonly accept = input<string | string[]>([]);
  /** Whether more than one file may be selected. */
  readonly multiple = input(false);
  /** Maximum number of files, or null for no limit. */
  readonly maxFiles = input<number | null>(null);
  /** Maximum size of one file in bytes, or null for no limit. */
  readonly maxFileSize = input<number | null>(null);
  /** Minimum size of one file in bytes. */
  readonly minFileSize = input(0);
  /** Maximum total size in bytes, or null for no limit. */
  readonly maxTotalSize = input<number | null>(null);
  /** Caller-supplied per-file validator, or null. */
  readonly validator = input<DropzoneValidator | null>(null);
  /** How a batch with rejections is handled. */
  readonly rejectionMode = input<DropzoneRejectionMode>('partial');
  /** Whether clicking the dropzone is ignored. */
  readonly noClick = input(false);
  /** Whether keyboard activation is ignored. */
  readonly noKeyboard = input(false);
  /** Whether the dropzone is disabled. */
  readonly disabled = input(false);

  /** Emits the result of every selection. */
  readonly filesChange = output<DropzoneResult>();
  /** Emits every drag state change. */
  readonly dragStateChange = output<DragState>();
  /** Emits every picker open or close. */
  readonly pickerStateChange = output<boolean>();

  /** Current interaction with the disabled flag applied. */
  readonly phase = this.store.phase;
  /** Current drag state. */
  readonly dragState = this.store.dragState;
  /** Currently selected files. */
  readonly files = this.store.files;
  /** Rejections from the last selection, or null when clean. */
  readonly error = this.store.error;
  /** Whether the control is disabled. */
  readonly isDisabled = this.store.disabled;

  /** Disabled state coming from the form control. */
  private readonly formDisabled = signal(false);
  /** Hidden input used to open the file picker. */
  private readonly fileInput: HTMLInputElement;
  /** Callback the forms API registers for validator changes. */
  private onValidatorChange: (() => void) | null = null;

  /** Resolved config from the directive inputs. */
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
      disabled: this.disabled(),
    }),
  );

  /** Creates the hidden file input and binds the host events. */
  constructor() {
    super();
    this.fileInput = this.document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.hidden = true;
    this.elementRef.nativeElement.appendChild(this.fileInput);
    this.elementRef.nativeElement.setAttribute('role', 'button');

    effect(() => this.store.setDisabled(this.config().disabled || this.formDisabled()));
    effect(() => this.syncAccessibility());

    this.bindDragEvents();
    this.bindActivationEvents();
    this.bindPickerEvents();
  }

  /** Tears down the event streams and removes the hidden input. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.fileInput.remove();
  }

  /**
   * Writes a form-control value into the store.
   * @param value Files from the form control.
   */
  override writeValue(value: File[] | null): void {
    super.writeValue(value);
    this.store.setFiles(value ?? []);
    this.store.clearError();
    this.onValidatorChange?.();
  }

  /**
   * Applies the form control's disabled state.
   * @param isDisabled Whether the control is disabled.
   */
  override setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /**
   * Reports the current rejections to the forms API.
   * @returns Validation errors, or null when clean.
   */
  validate(): ValidationErrors | null {
    const error = this.store.error();
    if (error === null) return null;
    if (error.length === 0) return null;
    return {
      dropzone: error.map((rejection) => ({
        name: rejection.file.name,
        reasons: rejection.reasons,
      })),
    };
  }

  /**
   * Registers the callback the forms API runs after a change.
   * @param fn Callback to run.
   */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /** Opens the hidden file picker. */
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

  /** Clears the selected files. */
  clear(): void {
    this.store.clearFiles();
    this.commit([]);
    this.filesChange.emit({ accepted: [], rejected: [] });
    this.onValidatorChange?.();
  }

  /** Subscribes to drag enter, over, leave, and drop. */
  private bindDragEvents(): void {
    const element = this.elementRef.nativeElement;
    const enter$ = fromEvent<DragEvent>(element, 'dragenter');
    const over$ = fromEvent<DragEvent>(element, 'dragover');
    const leave$ = fromEvent<DragEvent>(element, 'dragleave');
    const drop$ = fromEvent<DragEvent>(element, 'drop');

    const depth$ = merge(
      enter$.pipe(map(() => ({ kind: 'enter' }) as const)),
      leave$.pipe(map(() => ({ kind: 'leave' }) as const)),
      drop$.pipe(map(() => ({ kind: 'reset' }) as const)),
    ).pipe(scan(reduceDepth, 0));

    depth$
      .pipe(
        map((depth) => depth > 0),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
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

  /** Subscribes to click and keyboard activation. */
  private bindActivationEvents(): void {
    const element = this.elementRef.nativeElement;
    const click$ = fromEvent<MouseEvent>(element, 'click');
    const keydown$ = fromEvent<KeyboardEvent>(element, 'keydown');

    click$
      .pipe(
        filter((event) => event.target !== this.fileInput),
        filter(() => !this.isDisabled() && !this.config().noClick),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.openPicker());

    keydown$
      .pipe(
        filter((event) => event.key === 'Enter' || event.key === ' '),
        filter(() => !this.isDisabled() && !this.config().noKeyboard),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        event.preventDefault();
        this.openPicker();
      });
  }

  /** Subscribes to the hidden file input and window focus. */
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
          takeUntil(this.destroy$),
        )
        .subscribe(() => this.closePicker());
    }
  }

  /**
   * Updates the interaction when a drag enters or leaves.
   * @param active Whether a drag is over the element.
   */
  private onDragActive(active: boolean): void {
    if (this.isDisabled()) return;
    this.store.setInteraction(active ? 'drag-over' : 'idle');
    if (!active) this.setDragState(null);
  }

  /**
   * Recomputes the drag state from the current drag event.
   * @param event Drag event.
   */
  private updateDragState(event: DragEvent): void {
    this.setDragState(dragStateFor(event.dataTransfer, this.config().accept));
  }

  /**
   * Stores and emits a drag state.
   * @param state Drag state to store.
   */
  private setDragState(state: DragState): void {
    this.store.setDragState(state);
    this.dragStateChange.emit(state);
  }

  /** Returns the dropzone to idle and reports that the picker closed. */
  private closePicker(): void {
    this.store.setInteraction('idle');
    this.pickerStateChange.emit(false);
  }

  /**
   * Evaluates selected files and stores the outcome.
   * @param files Files chosen in this interaction.
   * @param directories Directories dragged in.
   */
  private process(files: File[], directories: File[]): void {
    const result = evaluateFiles(files, directories, this.store.files(), this.config());
    this.store.applyResult(result);
    this.commit(result.accepted);
    this.filesChange.emit(result);
    this.onValidatorChange?.();
  }

  /** Mirrors the disabled state to ARIA attributes. */
  private syncAccessibility(): void {
    const disabled = this.isDisabled();
    const element = this.elementRef.nativeElement;
    element.setAttribute('aria-disabled', String(disabled));
    element.setAttribute('tabindex', disabled ? '-1' : '0');
  }
}
