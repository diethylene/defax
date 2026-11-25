import type { StatusLightVariant } from '../../../shared/components/status-light/status-light.component';

/** Copy and dot colour shown for one connection status. */
export interface StatusState {
  /** Label on wide screens. */
  readonly label: string;
  /** Shorter label on narrow screens. */
  readonly labelMobile: string;
  /** One-line explanation. */
  readonly description: string;
  /** Colour of the status dot. */
  readonly variant: StatusLightVariant;
}
