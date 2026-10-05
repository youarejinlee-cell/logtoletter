import type { Entry } from "../types/domain";
import { isLogFriendId, LOG_FRIEND_NAMES, LOG_FRIEND_PRICE, LogFriendId } from "./logFriends";

// Version 2: keep server migration and mission labels in sync.
export const STAR_REWARDS = { daily: 1, records: { 5: 1, 10: 2, 20: 3, 109: 10 }, days: { 30: 3, 109: 10 }, notifications: 5 } as const;
export type StarTransaction = { id: string; amount: number; reason: string; createdAt: string };
export type StarWallet = { transactions: StarTransaction[]; seenEntries: Record<string, string>; selectedFriend?: LogFriendId; firstMetAt?: string; notificationCompletedAt?: string; recordCount?: number };
export function emptyStarWallet(): StarWallet { return { transactions: [], seenEntries: {} }; }
// Fixed reward timezone prevents changing device timezone from resetting daily milestones.
export function rewardDay(value: string | Date): string {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time + 9 * 3600000).toISOString().slice(0, 10) : "";
}
export function starBalance(wallet: StarWallet): number { return wallet.transactions.reduce((sum, t) => sum + t.amount, 0); }
export function normalizeStarWallet(value: unknown): StarWallet {
  const wallet = value as Partial<StarWallet> | null;
  const seen = new Set<string>();
  const normalized: StarWallet = {
    transactions: (Array.isArray(wallet?.transactions) ? wallet.transactions : []).filter(t => {
      if (!t || typeof t.id !== "string" || seen.has(t.id) || !Number.isSafeInteger(t.amount) || t.amount === 0 || typeof t.reason !== "string" || !rewardDay(t.createdAt)) return false;
      const purchase = t.id.startsWith("purchase:logfriend:");
      if (purchase ? (t.amount !== -LOG_FRIEND_PRICE || !isLogFriendId(t.id.slice(19)) || t.id.endsWith(":romi")) : (t.amount < 0 && !t.id.startsWith("admin:"))) return false;
      seen.add(t.id); return true;
    }),
    seenEntries: Object.fromEntries(Object.entries(wallet?.seenEntries || {}).filter(([id, day]) => id && typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)))
  };
  for (const key of ["firstMetAt", "notificationCompletedAt"] as const) if (wallet?.[key] && Number.isFinite(Date.parse(wallet[key]!))) normalized[key] = wallet[key];
  if (Number.isSafeInteger(wallet?.recordCount) && wallet!.recordCount! >= 0) normalized.recordCount = wallet!.recordCount;
  if (isLogFriendId(wallet?.selectedFriend) && ownsLogFriend(normalized, wallet.selectedFriend)) normalized.selectedFriend = wallet.selectedFriend;
  return normalized;
}
export function mergeStarWallet(a: StarWallet, b: StarWallet): StarWallet {
  return normalizeStarWallet({ transactions: [...a.transactions, ...b.transactions], seenEntries: { ...a.seenEntries, ...b.seenEntries }, selectedFriend: a.selectedFriend ?? b.selectedFriend, firstMetAt: [a.firstMetAt, b.firstMetAt].filter(Boolean).sort()[0], notificationCompletedAt: a.notificationCompletedAt ?? b.notificationCompletedAt, recordCount: a.recordCount ?? b.recordCount });
}
export function ownsLogFriend(wallet: StarWallet, id: LogFriendId): boolean {
  return id === "romi" || wallet.transactions.some(t => t.id === `purchase:logfriend:${id}` && t.amount === -LOG_FRIEND_PRICE);
}
export function purchaseGuestFriend(wallet: StarWallet, id: LogFriendId, now: Date): StarWallet {
  if (!isLogFriendId(id) || ownsLogFriend(wallet, id) || starBalance(wallet) < LOG_FRIEND_PRICE) return wallet;
  return { ...wallet, selectedFriend: id, transactions: [...wallet.transactions, { id: `purchase:logfriend:${id}`, amount: -LOG_FRIEND_PRICE, reason: `${LOG_FRIEND_NAMES[id]} 구매`, createdAt: now.toISOString() }] };
}
export function selectGuestFriend(wallet: StarWallet, id: LogFriendId): StarWallet {
  return isLogFriendId(id) && ownsLogFriend(wallet, id) ? { ...wallet, selectedFriend: id } : wallet;
}
function appendReward(wallet: StarWallet, id: string, amount: number, reason: string, now: Date): StarWallet {
  if (wallet.transactions.some(t => t.id === id)) return wallet;
  return { ...wallet, transactions: [...wallet.transactions, { id, amount, reason, createdAt: now.toISOString() }] };
}
export function rewardGuestMissions(wallet: StarWallet, entries: Entry[], now: Date): StarWallet {
  const seenEntries = { ...wallet.seenEntries };
  entries.forEach(e => { if (Date.parse(e.createdAt) <= now.getTime()) seenEntries[e.id] = rewardDay(e.createdAt); });
  let next = { ...wallet, seenEntries, firstMetAt: wallet.firstMetAt || now.toISOString() };
  const count = Object.values(seenEntries).filter(d => d && d <= rewardDay(now)).length;
  for (const [threshold, amount] of Object.entries(STAR_REWARDS.records)) if (count >= +threshold) next = { ...next, ...appendReward(next, `mission:v2:records:${threshold}`, amount, `누적 ${threshold}번째 기록`, now) };
  for (const [days, amount] of Object.entries(STAR_REWARDS.days)) if (now.getTime() >= Date.parse(next.firstMetAt) + +days * 86400000) next = { ...next, ...appendReward(next, `mission:v2:days:${days}`, amount, `로그플래닛과 만난 지 ${days}일`, now) };
  return next;
}
export function rewardGuestEntry(wallet: StarWallet, existing: Entry[], entry: Entry, now: Date): StarWallet {
  const seenEntries = { ...wallet.seenEntries };
  for (const old of existing) if (!(old.id in seenEntries) && Date.parse(old.createdAt) <= now.getTime()) seenEntries[old.id] = rewardDay(old.createdAt);
  const alreadySeen = entry.id in seenEntries;
  if (Date.parse(entry.createdAt) > now.getTime()) return { ...wallet, seenEntries };
  seenEntries[entry.id] = rewardDay(entry.createdAt);
  let next = { ...wallet, seenEntries };
  const day = rewardDay(now);
  if (!alreadySeen && day && rewardDay(entry.createdAt) === day && !wallet.transactions.some(t => t.id.startsWith(`daily:${day}:`))) next = appendReward(next, `daily:v2:${day}`, 1, "오늘 첫 기록", now);
  return rewardGuestMissions(next, [], now);
}
export function rewardGuestNotification(wallet: StarWallet, now: Date): StarWallet {
  return appendReward({ ...wallet, notificationCompletedAt: wallet.notificationCompletedAt || now.toISOString() }, "mission:v2:notifications", 5, "첫 알림 설정 완료", now);
}
// Older callers remain compatible; the monthly analysis reward was retired in v2.
export function rewardGuestAnalysis(wallet: StarWallet, _entries: Entry[], _month: string, _now: Date): StarWallet { return wallet; }
