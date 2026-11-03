import type { Role } from './role.type';

/** Maps each role to the other party. */
const OPPOSITE = {
  initiator: 'responder',
  responder: 'initiator',
} satisfies Record<Role, Role>;

/**
 * Returns the other party's role.
 * @param role The role to invert.
 * @returns The opposite role.
 */
export const opposite = (role: Role): Role => OPPOSITE[role];
