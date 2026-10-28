import type { Meta, StoryObj } from '@storybook/angular-vite';
import { DropzoneComponent } from './dropzone.component';

/** Dropzone idle and configured states. */
const meta: Meta<DropzoneComponent> = {
  title: 'Shared/Dropzone',
  component: DropzoneComponent,
  tags: ['autodocs']
};

export default meta;
/** One dropzone story. */
type Story = StoryObj<DropzoneComponent>;

/** Idle, accepting any file. */
export const Idle: Story = {};

/** Accepting images only. */
export const ImagesOnly: Story = {
  render: () => ({
    template: '<app-dropzone accept="image/*"></app-dropzone>'
  })
};

/** Accepting up to five files. */
export const Multiple: Story = {
  render: () => ({
    template: '<app-dropzone [multiple]="true" [maxFiles]="5"></app-dropzone>'
  })
};

/** Disabled dropzone. */
export const Disabled: Story = {
  render: () => ({
    template: '<app-dropzone [disabled]="true"></app-dropzone>'
  })
};

/** Dropzone that ignores clicks. */
export const NoClick: Story = {
  render: () => ({
    template: '<app-dropzone [noClick]="true"></app-dropzone>'
  })
};
