import type { Preview } from '@storybook/angular-vite';

/** Story defaults; accessibility violations fail the story test. */
const preview: Preview = {
  parameters: { a11y: { test: 'error' } },
};

export default preview;
