/** Build-time settings that differ between development and production. */
export interface Environment {
  /** Origin the web app calls the API on; '' means same-origin relative paths. */
  readonly apiBaseUrl: string;
  /** Fallback ICE servers used when TURN credential minting fails. */
  readonly rtc: {
    /** STUN server URLs for the fallback peer connection. */
    readonly stunUrls: readonly string[];
  };
  /** Data-channel tuning for file transfers. */
  readonly transfer: {
    /** Bytes per chunk the sender slices the file into. */
    readonly chunkSize: number;
    /** Buffered-amount threshold in bytes before the channel accepts more. */
    readonly bufferLow: number;
    /** Throughput ceiling in bytes per second for relayed sends. */
    readonly relayThrottleBytesPerSecond: number;
  };
  /** Timeouts bounding connection and request lifetimes. */
  readonly timeouts: {
    /** Milliseconds a peer connection has to open before it fails. */
    readonly connect: number;
    /** Milliseconds an API request runs before it is abandoned. */
    readonly request: number;
  };
  /** Presentation timings distinct from protocol tuning. */
  readonly ui: {
    /** Milliseconds the copied confirmation stays visible. */
    readonly copiedReset: number;
    /** Milliseconds between transfer speed samples. */
    readonly sampleInterval: number;
  };
}
