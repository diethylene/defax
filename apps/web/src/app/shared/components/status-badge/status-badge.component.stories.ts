import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StatusBadgeComponent } from './status-badge.component';

/** Status badge in each tone. */
const meta: Meta<StatusBadgeComponent> = {
  title: 'Shared/StatusBadge',
  component: StatusBadgeComponent,
};

export default meta;

/** Default tone. */
export const Neutral: StoryObj<StatusBadgeComponent> = {
  args: { label: 'Checking', tone: 'neutral' },
};

/** Healthy or successful state. */
export const Positive: StoryObj<StatusBadgeComponent> = {
  args: { label: 'API ok', tone: 'positive' },
};

/** Failed or unreachable state. */
export const Negative: StoryObj<StatusBadgeComponent> = {
  args: { label: 'API unreachable', tone: 'negative' },
};
