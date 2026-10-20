import { z } from 'zod';

export const rtcOfferSchema = z.object({ sdp: z.string().min(1) });
export type RtcOfferPayload = z.infer<typeof rtcOfferSchema>;

export const rtcAnswerSchema = z.object({ sdp: z.string().min(1) });
export type RtcAnswerPayload = z.infer<typeof rtcAnswerSchema>;

export const rtcIceSchema = z.object({
  candidate: z.string().nullable(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().int().nullable()
});
export type RtcIcePayload = z.infer<typeof rtcIceSchema>;

export const acceptSchema = z.object({});
export type AcceptPayload = z.infer<typeof acceptSchema>;

export const verifyResultSchema = z.object({ ok: z.boolean() });
export type VerifyResultPayload = z.infer<typeof verifyResultSchema>;

export function parseRtcOffer(json: string): RtcOfferPayload {
  return rtcOfferSchema.parse(JSON.parse(json));
}

export function parseRtcAnswer(json: string): RtcAnswerPayload {
  return rtcAnswerSchema.parse(JSON.parse(json));
}

export function parseRtcIce(json: string): RtcIcePayload {
  return rtcIceSchema.parse(JSON.parse(json));
}

export function parseAccept(json: string): AcceptPayload {
  return acceptSchema.parse(JSON.parse(json));
}

export function parseVerifyResult(json: string): VerifyResultPayload {
  return verifyResultSchema.parse(JSON.parse(json));
}
