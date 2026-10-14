export type RoomId = string;
export type Sid = Uint8Array; // 16 random bytes; base64url is its wire form

export interface RoomCreated {
  roomId: RoomId;
  sid: Sid;
}
