import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusLightVariants = cva(
  'inline-flex items-center font-medium text-foreground',
  {
    variants: {
      size: {
        sm: 'gap-1.5 text-xs',
        md: 'gap-2 text-sm',
        lg: 'gap-2 text-sm'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
);

const statusLightDotVariants = cva('shrink-0 rounded-full', {
  variants: {
    variant: {
      neutral: 'bg-neutral-400',
      positive: 'bg-green-500',
      warning: 'bg-amber-500',
      negative: 'bg-red-600'
    },
    size: {
      sm: 'size-1.5',
      md: 'size-2',
      lg: 'size-2.5'
    }
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md'
  }
});

export type StatusLightVariant = NonNullable<
  VariantProps<typeof statusLightDotVariants>['variant']
>;
export type StatusLightSize = NonNullable<
  VariantProps<typeof statusLightDotVariants>['size']
>;

@Component({
  selector: 'app-status-light',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="dotClasses()" aria-hidden="true"></span>
    <ng-content />
  `
})
export class StatusLightComponent {
  readonly variant = input<StatusLightVariant>('neutral');
  readonly size = input<StatusLightSize>('md');

  protected readonly dotClasses = computed(() =>
    statusLightDotVariants({ variant: this.variant(), size: this.size() })
  );

  constructor() {
    classes(() => statusLightVariants({ size: this.size() }));
  }
}
