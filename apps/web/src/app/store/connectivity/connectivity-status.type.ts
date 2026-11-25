/**
 * Where the device's connection stands, either the idle self-check heuristic
 * or the definitive route of a live transfer.
 */
export type ConnectivityStatus =
  | { readonly _tag: 'Checking' }
  | { readonly _tag: 'DirectPossible' }
  | { readonly _tag: 'RelayRequired' }
  | { readonly _tag: 'Offline' }
  | { readonly _tag: 'Direct' }
  | { readonly _tag: 'Relay' };

/** Self-check states shown while no transfer is active. */
export type Readiness = Extract<
  ConnectivityStatus,
  { _tag: 'Checking' | 'DirectPossible' | 'RelayRequired' | 'Offline' }
>;
