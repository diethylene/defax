import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUpload } from '@ng-icons/lucide';
import {
  applicationConfig,
  type Meta,
  type StoryObj
} from '@storybook/angular-vite';
import { NavComponent } from './nav';
import type { NavItem } from './nav-item';

const items: NavItem[] = [
  { label: 'Send', route: '/send', icon: 'lucideUpload' },
  { label: 'Receive', route: '/receive', icon: 'lucideDownload' }
];

const meta: Meta<NavComponent> = {
  title: 'Shared/Nav',
  component: NavComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        provideIcons({ lucideUpload, lucideDownload })
      ]
    })
  ],
  args: {
    items,
    activeRoute: '/send',
    ariaLabel: 'Primary'
  }
};

export default meta;
type Story = StoryObj<NavComponent>;

export const Default: Story = {};

export const ReceiveActive: Story = {
  args: { activeRoute: '/receive' }
};

export const Compact: Story = {
  args: { size: 'sm' }
};

export const Large: Story = {
  args: { size: 'lg' }
};
