import type { SaveState } from "./types";

export interface SerializedSave {
  version: number;
  payload: SaveState;
  // checksum?: string // à décider plus tard
}

export function serialize(state: SaveState): SerializedSave {
  return { version: state.version ?? 1, payload: state };
}

export function deserialize(s: SerializedSave): SaveState {
  // hook futur: migrations par version si besoin
  return s.payload;
}
