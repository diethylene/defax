import * as Schema from 'effect/Schema';

/** Notice that the peer cancelled the transfer. */
export const DisconnectNotice = Schema.Struct({
  /** Side that cancelled. */
  cancelledBy: Schema.Literals(['sender', 'receiver']),
});

/** A validated disconnect notice payload. */
export type DisconnectNotice = typeof DisconnectNotice.Type;

/** Hash of a received file, sent back to the sender for verification. */
export const FileHash = Schema.Struct({
  /** Non-empty digest of the file contents. */
  digest: Schema.NonEmptyString.pipe(Schema.brand('Digest')),
});

/** A validated file hash payload. */
export type FileHash = typeof FileHash.Type;

/** Receiver's acceptance of the transfer offer. */
export const Accept = Schema.Struct({});

/** A validated accept payload. */
export type Accept = typeof Accept.Type;

/** WebRTC offer carrying the sender's session description. */
export const RtcOffer = Schema.Struct({
  /** Session description protocol text, at least one character. */
  sdp: Schema.NonEmptyString,
});

/** A validated RTC offer payload. */
export type RtcOffer = typeof RtcOffer.Type;

/** WebRTC answer carrying the receiver's session description. */
export const RtcAnswer = Schema.Struct({
  /** Session description protocol text, at least one character. */
  sdp: Schema.NonEmptyString,
});

/** A validated RTC answer payload. */
export type RtcAnswer = typeof RtcAnswer.Type;

/** WebRTC ICE candidate, with null fields as the browser reports them. */
export const RtcIce = Schema.Struct({
  /** Candidate line, or null when gathering has ended. */
  candidate: Schema.NullOr(Schema.String),
  /** Media stream id, or null when the candidate carries none. */
  sdpMid: Schema.NullOr(Schema.String),
  /** Media stream line index, or null when the candidate carries none. */
  sdpMLineIndex: Schema.NullOr(Schema.Int),
});

/** A validated RTC ICE payload. */
export type RtcIce = typeof RtcIce.Type;

/** Result of the sender's verification of the received file hash. */
export const VerifyResult = Schema.Struct({
  /** Whether the hash matched. */
  ok: Schema.Boolean,
});

/** A validated verify result payload. */
export type VerifyResult = typeof VerifyResult.Type;
