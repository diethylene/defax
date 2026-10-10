export type NavSize = 'default' | 'sm' | 'lg';

export interface NavSizeClasses {
  item: string;
  icon: string;
}

export const navSizes: Record<NavSize, NavSizeClasses> = {
  default: {
    item: 'h-7 gap-1.5 rounded-xl px-2.5',
    icon: 'size-3.5'
  },
  sm: {
    item: 'h-6 gap-1 rounded-xl px-2',
    icon: 'size-3'
  },
  lg: {
    item: 'h-8 gap-2 rounded-xl px-3',
    icon: 'size-4'
  }
};
