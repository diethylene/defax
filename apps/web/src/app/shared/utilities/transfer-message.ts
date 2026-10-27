import * as Schema from 'effect/Schema';
import type {
  Accept,
  RtcAnswer,
  RtcIce,
  RtcOffer,
  VerifyResult
} from '@contract/signal/payload.model';
import * as Payload from '@contract/signal/payload.model';

export type {
  Accept,
  RtcAnswer,
  RtcIce,
  RtcOffer,
  VerifyResult
} from '@contract/signal/payload.model';

/** JSON decoder for RTC offer payloads. */
const rtcOfferFromJson = Schema.fromJsonString(Payload.RtcOffer);

/** JSON decoder for RTC answer payloads. */
const rtcAnswerFromJson = Schema.fromJsonString(Payload.RtcAnswer);

/** JSON decoder for RTC ICE payloads. */
const rtcIceFromJson = Schema.fromJsonString(Payload.RtcIce);

/** JSON decoder for accept payloads. */
const acceptFromJson = Schema.fromJsonString(Payload.Accept);

/** JSON decoder for verify result payloads. */
const verifyResultFromJson = Schema.fromJsonString(Payload.VerifyResult);

/**
 * Parses an RTC offer payload from its JSON wire form.
 * @param json The JSON text holding the offer.
 * @returns The validated offer.
 */
export const parseRtcOffer = (json: string): RtcOffer =>
  Schema.decodeUnknownSync(rtcOfferFromJson)(json);

/**
 * Parses an RTC answer payload from its JSON wire form.
 * @param json The JSON text holding the answer.
 * @returns The validated answer.
 */
export const parseRtcAnswer = (json: string): RtcAnswer =>
  Schema.decodeUnknownSync(rtcAnswerFromJson)(json);

/**
 * Parses an RTC ICE payload from its JSON wire form.
 * @param json The JSON text holding the candidate.
 * @returns The validated candidate.
 */
export const parseRtcIce = (json: string): RtcIce =>
  Schema.decodeUnknownSync(rtcIceFromJson)(json);

/**
 * Parses an accept payload from its JSON wire form.
 * @param json The JSON text holding the accept payload.
 * @returns The validated accept payload.
 */
export const parseAccept = (json: string): Accept =>
  Schema.decodeUnknownSync(acceptFromJson)(json);

/**
 * Parses a verify result payload from its JSON wire form.
 * @param json The JSON text holding the verify result.
 * @returns The validated verify result.
 */
export const parseVerifyResult = (json: string): VerifyResult =>
  Schema.decodeUnknownSync(verifyResultFromJson)(json);
