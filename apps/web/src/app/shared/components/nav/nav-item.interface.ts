/** One link in the navigation bar. */
export interface NavItem {
  /** Visible label. */
  label: string;
  /** Router path the link points at. */
  route: string;
  /** Icon name rendered before the label. */
  icon?: string;
  /** Whether only an exact path match counts as active. */
  exact?: boolean;
  /** Whether the label is hidden on small screens. */
  hideLabelOnMobile?: boolean;
}
