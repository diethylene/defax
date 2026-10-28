import type { Meta, StoryObj } from '@storybook/angular-vite';
import { CopyButtonComponent } from './copy-button.component';

/** Copy button with a value ready to copy. */
const meta: Meta<CopyButtonComponent> = {
  title: 'Shared/CopyButton',
  component: CopyButtonComponent,
  render: (args) => ({
    props: args,
    template:
      '<app-copy-button [label]="label" [variant]="variant" [disabled]="disabled" value="copy me"></app-copy-button>'
  }),
  args: {
    label: 'Copy code',
    variant: 'default',
    disabled: false
  }
};

export default meta;
/** One copy button story. */
type Story = StoryObj<CopyButtonComponent>;

/** Button with its visible label. */
export const Default: Story = {};

/** Icon-only button. */
export const IconOnly: Story = { args: { label: '' } };

/** Ghost variant. */
export const Ghost: Story = { args: { variant: 'ghost' } };

/** Disabled button. */
export const Disabled: Story = { args: { disabled: true } };
