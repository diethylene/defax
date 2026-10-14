import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { CopyDirective } from '../../directives/copy.directive';

const COPIED_CLASSES =
  'bg-success text-success-foreground hover:bg-success hover:text-success-foreground dark:hover:bg-success dark:hover:text-success-foreground';

@Component({
  selector: 'app-copy-button',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideCopy, lucideCheck })],
  hostDirectives: [{ directive: CopyDirective, inputs: ['value'] }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      hlmBtn
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabelValue()"
    >
      <span class="relative inline-flex size-4">
        <ng-icon
          name="lucideCopy"
          size="16"
          class="transition-all duration-200"
          [class.opacity-0]="copied()"
          [class.scale-0]="copied()"
        />
        <ng-icon
          name="lucideCheck"
          size="16"
          class="absolute left-0 top-0 transition-all duration-200"
          [class.opacity-0]="!copied()"
          [class.scale-0]="!copied()"
        />
      </span>
      @if (label()) {
        <span>{{ label() }}</span>
      }
    </button>
  `
})
export class CopyButtonComponent {
  private readonly copyDirective = inject(CopyDirective, { host: true });
  private readonly button = viewChild(HlmButton);

  readonly variant = input<'default' | 'ghost'>('default');
  readonly label = input('Copy code');
  readonly ariaLabel = input('Copy');
  readonly disabled = input(false);

  protected readonly copied = this.copyDirective.copied;
  protected readonly iconOnly = computed(() => this.label() === '');
  protected readonly size = computed(() =>
    this.iconOnly() ? 'icon' : 'default'
  );
  protected readonly ariaLabelValue = computed(() =>
    this.iconOnly() ? this.ariaLabel() : null
  );

  constructor() {
    effect(() => {
      const classes = this.copyDirective.copied() ? COPIED_CLASSES : '';
      this.button()?.setClass(classes);
    });
  }
}
