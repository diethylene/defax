import type { Result } from 'effect/Result';
import * as Schema from 'effect/Schema';
import { base64UrlBytes } from './base64url-bytes.model';
import { ErrorCode } from './error-code.model';
import { SealedKind } from './sealed-kind.model';
import { Sid } from './sid.model';

/** Opens a session with the protocol version the peer speaks. */
export const JoinMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('join'),
  /** Protocol version the peer speaks. */
  protocol: Schema.Number,
});

/** A validated join message. */
export type JoinMessage = typeof JoinMessage.Type;

/** Carries the peer's PAKE public key. */
export const PakeMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('pake'),
  /** The 32-byte PAKE public key in base64url. */
  y: base64UrlBytes(32, 'pake y'),
});

/** A validated pake message. */
export type PakeMessage = typeof PakeMessage.Type;

/** Carries an end-to-end encrypted payload. */
export const SealedMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('sealed'),
  /** Kind of payload encrypted in the ciphertext. */
  kind: SealedKind,
  /** The encrypted payload in base64url. */
  ct: Schema.NonEmptyString,
});

/** A validated sealed message. */
export type SealedMessage = typeof SealedMessage.Type;

/** Tells the peer it entered the room and hands out its session id. */
export const JoinedMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('joined'),
  /** The 16-byte session id in base64url. */
  sid: Sid,
});

/** A validated joined message. */
export type JoinedMessage = typeof JoinedMessage.Type;

/** Tells the peer that the other side has arrived. */
export const PeerJoinedMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('peer-joined'),
});

/** A validated peer-joined message. */
export type PeerJoinedMessage = typeof PeerJoinedMessage.Type;

/** Reports a relay-level failure that ends the session. */
export const ErrorMessage = Schema.Struct({
  /** Message discriminant. */
  type: Schema.Literal('error'),
  /** Reason the relay refused or ended the session. */
  code: ErrorCode,
});

/** A validated error message. */
export type ErrorMessage = typeof ErrorMessage.Type;

/** Messages a peer sends to the relay. */
export const InboundMessage = Schema.Union([JoinMessage, PakeMessage, SealedMessage]).pipe(
  Schema.toTaggedUnion('type'),
);

/** A validated inbound message. */
export type InboundMessage = typeof InboundMessage.Type;

/** Messages the relay sends to a peer. */
export const OutboundMessage = Schema.Union([
  JoinedMessage,
  PeerJoinedMessage,
  ErrorMessage,
  PakeMessage,
  SealedMessage,
]).pipe(Schema.toTaggedUnion('type'));

/** A validated outbound message. */
export type OutboundMessage = typeof OutboundMessage.Type;

/**
 * Parses a raw wire frame as an inbound message.
 * @param input The JSON text received from the peer.
 * @returns The decoded message, or a SchemaError when the frame is invalid.
 */
export const decodeInbound = (input: string): Result<InboundMessage, Schema.SchemaError> =>
  Schema.decodeUnknownResult(Schema.fromJsonString(InboundMessage))(input);
