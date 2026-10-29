/** A party in a signaling room. */
export type Role = 'initiator' | 'responder';

/** Maps each role to the other party. */
const OPPOSITE: Record<Role, Role> = {
  initiator: 'responder',
  responder: 'initiator',
};

/**
 * Returns the other party's role.
 * @param role The role to invert.
 * @returns The opposite role.
 */
export const opposite = (role: Role): Role => OPPOSITE[role];
