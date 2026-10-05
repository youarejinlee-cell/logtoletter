import * as Crypto from "expo-crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createId() {
  return Crypto.randomUUID();
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}
