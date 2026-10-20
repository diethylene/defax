export const TRANSFER_CHUNK_SIZE = 64 * 1024;

export const DATA_CHANNEL_LABEL = 'file';

export const DATA_CHANNEL_BUFFER_LOW = 1024 * 1024;

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};
