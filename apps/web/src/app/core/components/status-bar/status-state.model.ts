import type { StatusLightVariant } from '../../../shared/components/status-light/status-light.component';

/** Connection statuses the bar can show. */
export type StatusBarStatus = Exclude<StatusLightVariant, 'info'>;

/** Copy shown for one connection status. */
export interface StatusState {
  /** Label on wide screens. */
  label: string;
  /** Shorter label on narrow screens. */
  labelMobile: string;
  /** One-line explanation. */
  description: string;
}

/** Copy for every connection status. */
export const statusStates: Record<StatusBarStatus, StatusState> = {
  neutral: {
    label: 'Checking your network',
    labelMobile: 'Checking network',
    description: 'Testing whether a direct connection is possible.'
  },
  positive: {
    label: 'Direct connection available',
    labelMobile: 'Direct connection',
    description: 'Files go straight between devices.'
  },
  warning: {
    label: 'Relay required',
    labelMobile: 'Relay required',
    description: 'Still end-to-end encrypted, but transfers may be slower.'
  },
  negative: {
    label: 'Offline',
    labelMobile: 'Offline',
    description: "Can't reach the connection service. Check your internet."
  }
};
