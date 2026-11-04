import * as Schema from 'effect/Schema';
import { ApiMeta } from './api-meta.model';

/**
 * Builds the success envelope schema wrapping one endpoint's data.
 * @param data Schema of the endpoint's payload.
 * @returns The enveloped success schema.
 */
export const apiEnvelopeOf = <A, I>(data: Schema.Codec<A, I, never, never>) =>
  Schema.Struct({
    /** Always `success` on a successful response. */
    status: Schema.Literal('success'),
    /** The endpoint's payload. */
    data,
    /** Response metadata. */
    meta: ApiMeta,
  });
