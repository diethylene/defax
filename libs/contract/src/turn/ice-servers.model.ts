import * as Schema from 'effect/Schema';

/** One ICE server entry Cloudflare returns for a TURN credential. */
export const IceServer = Schema.Struct({
  /** STUN or TURN URLs for this server. */
  urls: Schema.Array(Schema.String),
  /** TURN username, present on the TURN entry only. */
  username: Schema.optional(Schema.String),
  /** TURN credential, present on the TURN entry only. */
  credential: Schema.optional(Schema.String),
});

/** Body Cloudflare's generate-ice-servers endpoint returns. */
export const IceServersResponse = Schema.Struct({
  /** ICE servers to pass to RTCPeerConnection. */
  iceServers: Schema.Array(IceServer),
});

/** A validated ICE server entry. */
export type IceServer = typeof IceServer.Type;

/** A validated generate-ice-servers response. */
export type IceServersResponse = typeof IceServersResponse.Type;
