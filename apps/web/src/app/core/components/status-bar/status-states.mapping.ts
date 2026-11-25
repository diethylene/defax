import type { ConnectivityStatus } from '@web/store/connectivity/connectivity-status.type';
import type { StatusState } from './status-state.interface';

/** Copy and dot colour for every connectivity status tag. */
export const statusStates = {
  Checking: {
    label: 'Checking your network',
    labelMobile: 'Checking network',
    description: 'Testing whether a direct connection is possible.',
    variant: 'neutral',
  },
  DirectPossible: {
    label: 'Direct connection possible',
    labelMobile: 'Direct possible',
    description: 'Your network should allow a direct connection.',
    variant: 'positive',
  },
  RelayRequired: {
    label: 'Relay required',
    labelMobile: 'Relay required',
    description: 'Still end-to-end encrypted, but transfers may be slower.',
    variant: 'warning',
  },
  Offline: {
    label: 'Offline',
    labelMobile: 'Offline',
    description: "Can't reach the connection service. Check your internet.",
    variant: 'negative',
  },
  Direct: {
    label: 'Direct',
    labelMobile: 'Direct',
    description: 'Connected directly to the other device.',
    variant: 'positive',
  },
  Relay: {
    label: 'Relay',
    labelMobile: 'Relay',
    description: 'Connected through a relay. Still end-to-end encrypted.',
    variant: 'warning',
  },
} as const satisfies Record<ConnectivityStatus['_tag'], StatusState>;
