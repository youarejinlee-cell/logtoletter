export const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessStatus = "not_started" | "trial" | "subscribed" | "expired";

export function normalizeTrialStart(value: unknown): string | undefined {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

// Merging an offline/device trial may shorten an account trial, never restart it.
export function earliestTrialStart(...values: unknown[]): string | undefined {
  return values.map(normalizeTrialStart).filter((value): value is string => Boolean(value)).sort()[0];
}

export function getAccessState(startedAt: string | undefined, subscribed: boolean, now = new Date()) {
  const normalized = normalizeTrialStart(startedAt);
  const endsAt = normalized ? new Date(Date.parse(normalized) + TRIAL_DAYS * DAY_MS).toISOString() : undefined;
  const daysRemaining = endsAt ? Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / DAY_MS)) : TRIAL_DAYS;
  // A future timestamp is invalid, rather than an opportunity to extend the trial.
  const validTrial = normalized && Date.parse(normalized) <= now.getTime() && daysRemaining > 0;
  const status: AccessStatus = subscribed ? "subscribed" : !normalized ? "not_started" : validTrial ? "trial" : "expired";
  return { status, endsAt, daysRemaining, canCreate: status !== "expired" };
}

export function accessStatusLabel(access: ReturnType<typeof getAccessState>): string {
  if (access.status === "subscribed") return "연간 구독 이용 중";
  if (access.status === "not_started") return "첫 기록부터 30일 무료 · 자동 결제 없음";
  if (access.status === "expired") return "이용기간 종료 · 기존 기록과 행성은 볼 수 있어";
  const end = new Date(access.endsAt!);
  const date = `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, "0")}.${String(end.getDate()).padStart(2, "0")}`;
  const time = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  return `무료 체험 ${access.daysRemaining}일 남음 · ${date} ${time} 종료`;
}
