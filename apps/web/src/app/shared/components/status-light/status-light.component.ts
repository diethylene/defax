import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/** Layout classes for the status light wrapper. */
const statusLightVariants = cva('inline-flex items-center font-medium text-foreground', {
  variants: {
    size: {
      sm: 'gap-1.5 text-xs',
      md: 'gap-2 text-sm',
      lg: 'gap-2 text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/** Classes for the coloured dot. */
const statusLightDotVariants = cva('shrink-0 rounded-full', {
  variants: {
    variant: {
      neutral: 'bg-neutral-400',
      positive: 'bg-green-500',
      warning: 'bg-amber-500',
      negative: 'bg-red-600',
      info: 'bg-blue-500',
    },
    size: {
      sm: 'size-1.5',
      md: 'size-2',
      lg: 'size-2.5',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

/** Colour of the status dot. */
export type StatusLightVariant = NonNullable<
  VariantProps<typeof statusLightDotVariants>['variant']
>;
/** Size of the status dot. */
export type StatusLightSize = NonNullable<VariantProps<typeof statusLightDotVariants>['size']>;

/** A coloured dot followed by a status label. */
@Component({
  selector: 'app-status-light',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="dotClasses()" aria-hidden="true"></span>
    <ng-content />
  `,
})
export class StatusLightComponent {
  /** Colour of the dot. */
  readonly variant = input<StatusLightVariant>('neutral');
  /** Size of the dot. */
  readonly size = input<StatusLightSize>('md');

  /** Classes for the dot from the current variant and size. */
  protected readonly dotClasses = computed(() =>
    statusLightDotVariants({ variant: this.variant(), size: this.size() }),
  );

  /** Applies the wrapper classes from the current size. */
  constructor() {
    classes(() => statusLightVariants({ size: this.size() }));
  }
}
