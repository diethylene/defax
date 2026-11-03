import type { StatusState } from './status-state.interface';
import type { StatusBarStatus } from './status-state.type';

/** Copy for every connection status. */
export const statusStates = {
  neutral: {
    label: 'Checking your network',
    labelMobile: 'Checking network',
    description: 'Testing whether a direct connection is possible.',
  },
  positive: {
    label: 'Direct connection available',
    labelMobile: 'Direct connection',
    description: 'Files go straight between devices.',
  },
  warning: {
    label: 'Relay required',
    labelMobile: 'Relay required',
    description: 'Still end-to-end encrypted, but transfers may be slower.',
  },
  negative: {
    label: 'Offline',
    labelMobile: 'Offline',
    description: "Can't reach the connection service. Check your internet.",
  },
} satisfies Record<StatusBarStatus, StatusState>;
