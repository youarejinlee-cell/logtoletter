import { supabase } from "./supabase";
import { normalizeStarWallet, StarWallet } from "./starRewards";
import type { LogFriendId } from "./logFriends";
export async function fetchStarWallet(userId: string): Promise<StarWallet> {
  if (!supabase) throw new Error("서버 연결이 필요합니다.");
  const { data: progress, error: progressError } = await supabase.rpc("refresh_star_missions");
  if (progressError) throw progressError;
  const transactions = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("star_reward_ledger").select("reward_key,amount,reason,created_at").eq("user_id", userId).order("created_at", { ascending: true }).order("reward_key", { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    transactions.push(...(data || []).map(row => ({ id: row.reward_key, amount: row.amount, reason: row.reason, createdAt: row.created_at })));
    if (!data || data.length < 1000) break;
  }
  const { data: companion, error: companionError } = await supabase.from("log_friend_selection").select("friend_id").eq("user_id", userId).maybeSingle();
  if (companionError) throw companionError;
  return normalizeStarWallet({ ...progress, transactions, selectedFriend: companion?.friend_id });
}
export async function updateRemoteFriend(id: LogFriendId, purchase: boolean) {
  const { error } = await supabase.rpc(purchase ? "purchase_log_friend" : "select_log_friend", { p_friend: id });
  if (error) throw error;
}
export async function claimMonthlyStars(month: string) {
  if (!supabase) throw new Error("서버 연결이 필요합니다.");
  const { error } = await supabase.rpc("claim_monthly_analysis_stars", { p_month: month });
  if (error) throw error;
}

export async function completeNotificationMission() {
  const { error } = await supabase.rpc("complete_notification_mission");
  if (error) throw error;
}
