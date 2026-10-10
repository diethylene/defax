export type NavSize = 'default' | 'sm' | 'lg';

export interface NavSizeClasses {
  container: string;
  item: string;
  icon: string;
}

export const navSizes: Record<NavSize, NavSizeClasses> = {
  default: {
    container: 'p-1',
    item: 'h-9 gap-2 rounded-lg px-3',
    icon: 'size-4'
  },
  sm: {
    container: 'p-1',
    item: 'h-8 gap-1.5 rounded-md px-2.5',
    icon: 'size-3.5'
  },
  lg: {
    container: 'p-1.5',
    item: 'h-10 gap-2.5 rounded-lg px-4',
    icon: 'size-5'
  }
};
