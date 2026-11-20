export const TRANSFER_CHUNK_SIZE = 256 * 1024;

export const DATA_CHANNEL_LABEL = 'file';

export const DATA_CHANNEL_BUFFER_LOW = 1024 * 1024;

/** Fallback ICE config (STUN only) used when TURN credential minting fails. */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
};

/** Data-channel throughput ceiling for relayed transfers, 5 Mbps. */
export const RELAY_THROTTLE_BYTES_PER_SECOND = 625_000;
