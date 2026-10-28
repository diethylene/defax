import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { CopyDirective } from '../../directives/copy.directive';

/** Classes applied to the button while the copied confirmation shows. */
const COPIED_CLASSES =
  'bg-success text-success-foreground hover:bg-success hover:text-success-foreground dark:hover:bg-success dark:hover:text-success-foreground';

/** Copy-to-clipboard button with a brief success state. */
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
  `,
})
export class CopyButtonComponent {
  /** Host directive that performs the copy and exposes the copied state. */
  private readonly copyDirective = inject(CopyDirective, { host: true });
  /** Button element whose success classes are swapped. */
  private readonly button = viewChild(HlmButton);

  /** Button variant. */
  readonly variant = input<'default' | 'ghost'>('default');
  /** Visible label; an empty label renders an icon-only button. */
  readonly label = input('Copy code');
  /** Accessible label used when the button is icon-only. */
  readonly ariaLabel = input('Copy');
  /** Whether the button is disabled. */
  readonly disabled = input(false);

  /** Whether the last copy succeeded within the reset window. */
  protected readonly copied = this.copyDirective.copied;
  /** Whether no visible label is rendered. */
  protected readonly iconOnly = computed(() => this.label() === '');
  /** Button size chosen from the label state. */
  protected readonly size = computed(() => (this.iconOnly() ? 'icon' : 'default'));
  /** Accessible label, present only for the icon-only button. */
  protected readonly ariaLabelValue = computed(() => (this.iconOnly() ? this.ariaLabel() : null));

  /** Keeps the button classes in sync with the copied state. */
  constructor() {
    effect(() => {
      const classes = this.copyDirective.copied() ? COPIED_CLASSES : '';
      this.button()?.setClass(classes);
    });
  }
}
