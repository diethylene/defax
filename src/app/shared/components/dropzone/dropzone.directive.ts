import { DOCUMENT } from '@angular/common';
import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  forwardRef,
  HostListener,
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
import { AbstractControlValueAccessor } from '../../abstractions/control-value-accessor';
import { matchesMimeType } from './dropzone.accept';
import { parseDropzoneConfig } from './dropzone.config';
import type {
  DragState,
  DropzoneRejectionMode,
  DropzoneResult,
  DropzoneValidator
} from './dropzone.model';
import { DropzoneStore } from './dropzone.store';
import { evaluateFiles } from './dropzone.validate';

interface ExtractedDrop {
  files: File[];
  directories: File[];
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

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
  private dragDepth = 0;
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
    this.fileInput.addEventListener('change', this.onPickerChange);
    this.fileInput.addEventListener('cancel', this.onPickerCancel);
    this.elementRef.nativeElement.appendChild(this.fileInput);

    this.elementRef.nativeElement.setAttribute('role', 'button');

    effect(() =>
      this.store.setDisabled(this.config().disabled || this.formDisabled())
    );
    effect(() => this.syncAccessibility());

    const win = this.document.defaultView;
    win?.addEventListener('focus', this.onWindowFocus);
    this.destroyRef.onDestroy(() => {
      win?.removeEventListener('focus', this.onWindowFocus);
      this.fileInput.removeEventListener('change', this.onPickerChange);
      this.fileInput.removeEventListener('cancel', this.onPickerCancel);
      this.fileInput.remove();
    });
  }

  override writeValue(value: File[] | null): void {
    super.writeValue(value);
    this.store.setFiles(value ?? []);
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

  @HostListener('click')
  onClick(): void {
    if (this.isDisabled() || this.config().noClick) return;
    this.openPicker();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.config().noKeyboard) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker();
    }
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    if (this.isDisabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth += 1;
    this.store.setInteraction('drag-over');
    this.updateDragState(event);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    if (this.isDisabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateDragState(event);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    if (this.isDisabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.leaveDrag();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    if (this.isDisabled()) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = 0;
    this.leaveDrag();
    const { files, directories } = this.extractDrop(event.dataTransfer);
    this.process(files, directories);
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

  private readonly onPickerChange = (): void => {
    const files = Array.from(this.fileInput.files ?? []);
    this.closePicker();
    this.process(files, []);
  };

  private readonly onPickerCancel = (): void => {
    this.closePicker();
  };

  private readonly onWindowFocus = (): void => {
    if (this.store.interaction() === 'picker-open') this.closePicker();
  };

  private closePicker(): void {
    this.store.setInteraction('idle');
    this.pickerStateChange.emit(false);
  }

  private leaveDrag(): void {
    this.store.setInteraction('idle');
    this.setDragState(null);
  }

  private updateDragState(event: DragEvent): void {
    const transfer = event.dataTransfer;
    if (!transfer || !Array.from(transfer.types).includes('Files')) {
      this.setDragState('invalid');
      return;
    }
    const accept = this.config().accept;
    if (accept.length === 0) {
      this.setDragState('valid');
      return;
    }
    const itemTypes = Array.from(transfer.items ?? []).map((item) => item.type);
    const known = itemTypes.filter((type) => type.length > 0);
    if (
      known.length > 0 &&
      known.every((type) => matchesMimeType(type, accept))
    ) {
      this.setDragState('valid');
      return;
    }
    if (known.some((type) => !matchesMimeType(type, accept))) {
      this.setDragState('invalid');
      return;
    }
    this.setDragState('unknown');
  }

  private setDragState(state: DragState): void {
    this.store.setDragState(state);
    this.dragStateChange.emit(state);
  }

  private extractDrop(dataTransfer: DataTransfer | null): ExtractedDrop {
    const files: File[] = [];
    const directories: File[] = [];
    if (dataTransfer?.items) {
      for (const item of Array.from(dataTransfer.items)) {
        const entry = item.webkitGetAsEntry();
        if (entry?.isDirectory) {
          directories.push(new File([], entry.name, { type: '' }));
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    } else if (dataTransfer?.files) {
      files.push(...Array.from(dataTransfer.files));
    }
    return { files, directories };
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
