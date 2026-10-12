import type { Meta, StoryObj } from '@storybook/angular-vite';
import { DropzoneComponent } from './dropzone.component';

const meta: Meta<DropzoneComponent> = {
  title: 'Shared/Dropzone',
  component: DropzoneComponent,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<DropzoneComponent>;

export const Idle: Story = {};

export const ImagesOnly: Story = {
  render: () => ({
    template: '<app-dropzone accept="image/*"></app-dropzone>'
  })
};

export const Multiple: Story = {
  render: () => ({
    template: '<app-dropzone [multiple]="true" [maxFiles]="5"></app-dropzone>'
  })
};

export const Disabled: Story = {
  render: () => ({
    template: '<app-dropzone [disabled]="true"></app-dropzone>'
  })
};

export const NoClick: Story = {
  render: () => ({
    template: '<app-dropzone [noClick]="true"></app-dropzone>'
  })
};
