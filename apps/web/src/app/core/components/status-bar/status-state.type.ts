import type { StatusLightVariant } from '../../../shared/components/status-light/status-light.component';

/** Connection statuses the bar can show. */
export type StatusBarStatus = Exclude<StatusLightVariant, 'info'>;
