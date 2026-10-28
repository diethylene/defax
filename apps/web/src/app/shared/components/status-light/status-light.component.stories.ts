import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StatusLightComponent } from './status-light.component';

/** Status light in each tone and size. */
const meta: Meta<StatusLightComponent> = {
  title: 'Shared/StatusLight',
  component: StatusLightComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: '<app-status-light [variant]="variant" [size]="size">Status</app-status-light>',
  }),
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'positive', 'warning', 'negative', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    variant: 'neutral',
    size: 'md',
  },
};

export default meta;
/** One status light story. */
type Story = StoryObj<StatusLightComponent>;

/** Neutral tone. */
export const Neutral: Story = { args: { variant: 'neutral' } };
/** Positive tone. */
export const Positive: Story = { args: { variant: 'positive' } };
/** Warning tone. */
export const Warning: Story = { args: { variant: 'warning' } };
/** Negative tone. */
export const Negative: Story = { args: { variant: 'negative' } };
/** Info tone. */
export const Info: Story = { args: { variant: 'info' } };

/** Every size side by side. */
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col items-start gap-4">
        <app-status-light size="sm" variant="positive">Small</app-status-light>
        <app-status-light size="md" variant="positive">Medium</app-status-light>
        <app-status-light size="lg" variant="positive">Large</app-status-light>
      </div>
    `,
  }),
};
