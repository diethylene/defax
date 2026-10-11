import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StatusLightComponent } from './status-light';

const meta: Meta<StatusLightComponent> = {
  title: 'Shared/StatusLight',
  component: StatusLightComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template:
      '<app-status-light [variant]="variant" [size]="size">Status</app-status-light>'
  }),
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'positive', 'warning', 'negative']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  },
  args: {
    variant: 'neutral',
    size: 'md'
  }
};

export default meta;
type Story = StoryObj<StatusLightComponent>;

export const Neutral: Story = { args: { variant: 'neutral' } };
export const Positive: Story = { args: { variant: 'positive' } };
export const Warning: Story = { args: { variant: 'warning' } };
export const Negative: Story = { args: { variant: 'negative' } };

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col items-start gap-4">
        <app-status-light size="sm" variant="positive">Small</app-status-light>
        <app-status-light size="md" variant="positive">Medium</app-status-light>
        <app-status-light size="lg" variant="positive">Large</app-status-light>
      </div>
    `
  })
};
