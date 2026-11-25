import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StatusPillComponent } from './status-pill.component';
import { statusStates } from './status-states.mapping';

/** Status pill in every connectivity state. */
const meta: Meta<StatusPillComponent> = {
  title: 'Core/StatusPill',
  component: StatusPillComponent,
  render: (args) => ({
    props: args,
    template: '<app-status-pill [state]="state" />',
  }),
  args: {
    state: statusStates.Checking,
  },
};

export default meta;
/** One status pill story. */
type Story = StoryObj<StatusPillComponent>;

/** Waiting for the self-check to finish. */
export const Checking: Story = { args: { state: statusStates.Checking } };
/** The network should allow a direct connection. */
export const DirectPossible: Story = { args: { state: statusStates.DirectPossible } };
/** Transfers need the relay. */
export const RelayRequired: Story = { args: { state: statusStates.RelayRequired } };
/** The connection service is unreachable. */
export const Offline: Story = { args: { state: statusStates.Offline } };
/** Connected directly during a transfer. */
export const Direct: Story = { args: { state: statusStates.Direct } };
/** Connected through a relay during a transfer. */
export const Relay: Story = { args: { state: statusStates.Relay } };
