import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUpload } from '@ng-icons/lucide';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular-vite';
import { NavComponent } from './nav.component';
import type { NavItem } from './nav-item.model';

/** Links shown in the nav stories. */
const items: NavItem[] = [
  { label: 'Send', route: '/send', icon: 'lucideUpload' },
  { label: 'Receive', route: '/receive', icon: 'lucideDownload' },
];

/** Navigation bar with a router and icons. */
const meta: Meta<NavComponent> = {
  title: 'Shared/Nav',
  component: NavComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([]), provideIcons({ lucideUpload, lucideDownload })],
    }),
  ],
  args: {
    items,
    activeRoute: '/send',
    ariaLabel: 'Primary',
  },
};

export default meta;
/** One nav story. */
type Story = StoryObj<NavComponent>;

/** Send link active. */
export const Default: Story = {};

/** Receive link active. */
export const ReceiveActive: Story = {
  args: { activeRoute: '/receive' },
};
