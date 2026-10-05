export const LOG_FRIEND_IDS = ["romi", "rogi", "roa", "rona"] as const;
export type LogFriendId = typeof LOG_FRIEND_IDS[number];
export const LOG_FRIEND_PRICE = 50;
export const LOG_FRIEND_NAMES: Record<LogFriendId, string> = { romi: "로미", rogi: "로기", roa: "로아", rona: "로나" };
export function isLogFriendId(value: unknown): value is LogFriendId { return LOG_FRIEND_IDS.includes(value as LogFriendId); }
