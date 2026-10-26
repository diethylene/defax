import type { StatusLightVariant } from '../../../shared/components/status-light/status-light';

export type StatusBarStatus = Exclude<StatusLightVariant, 'info'>;

export interface StatusState {
  label: string;
  labelMobile: string;
  description: string;
}

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
