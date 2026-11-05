import {
  ErrorMessage,
  JoinedMessage,
  JoinMessage,
  PakeMessage,
  PeerJoinedMessage,
  SealedMessage,
} from '@contract/signal/message.model';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/** Wire message exchanged between a peer and the relay. */
export type SignalMessage =
  | JoinMessage
  | PakeMessage
  | SealedMessage
  | JoinedMessage
  | PeerJoinedMessage
  | ErrorMessage;

/** Contract schema covering every wire message member. */
const signalMessageSchema = Schema.Union([
  JoinMessage,
  PakeMessage,
  SealedMessage,
  JoinedMessage,
  PeerJoinedMessage,
  ErrorMessage,
]);

/**
 * Decodes a wire message against the contract.
 * @param data Candidate message received from a transport.
 * @returns The decoded message, or null when no contract member matches.
 */
export const parseSignalMessage = (data: unknown): SignalMessage | null =>
  Option.getOrNull(Schema.decodeUnknownOption(signalMessageSchema)(data));
