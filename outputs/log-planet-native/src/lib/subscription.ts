import { Platform } from "react-native";
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from "react-native-purchases";

export const PREMIUM_ENTITLEMENT_ID = "premium";
const revenueCatApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  default: undefined
});

let configured = false;
let currentAppUserId: string | null = null;

export type SubscriptionSnapshot = {
  configured: boolean;
  active: boolean;
  annualPackage: PurchasesPackage | null;
  managementUrl: string | null;
};

function hasPremium(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

async function refreshRevenueCatUser(userId: string | null): Promise<SubscriptionSnapshot> {
  if (!revenueCatApiKey) {
    return { configured: false, active: false, annualPackage: null, managementUrl: null };
  }

  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({ apiKey: revenueCatApiKey, appUserID: userId || undefined });
    configured = true;
    currentAppUserId = userId;
  } else if (userId && currentAppUserId !== userId) {
    await Purchases.logIn(userId);
    currentAppUserId = userId;
  } else if (!userId && currentAppUserId) {
    await Purchases.logOut();
    currentAppUserId = null;
  }

  const [customerInfo, offerings] = await Promise.all([
    Purchases.getCustomerInfo(),
    // Catalog availability must never revoke a verified subscriber's access.
    Purchases.getOfferings().catch(() => null)
  ]);
  const annualPackage = offerings?.current?.annual
    || offerings?.current?.availablePackages.find((item) => item.packageType === "ANNUAL")
    || null;

  return {
    configured: true,
    active: hasPremium(customerInfo),
    annualPackage,
    managementUrl: customerInfo.managementURL
  };
}

// The SDK has one active identity. Serialize refreshes during login/account changes.
let refreshQueue: Promise<unknown> = Promise.resolve();
export function syncRevenueCatUser(userId: string | null): Promise<SubscriptionSnapshot> {
  const request = refreshQueue.then(() => refreshRevenueCatUser(userId));
  refreshQueue = request.catch(() => undefined);
  return request;
}

export async function purchasePremium(aPackage: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(aPackage);
  return { active: hasPremium(customerInfo), managementUrl: customerInfo.managementURL };
}

export async function restorePremium() {
  const customerInfo = await Purchases.restorePurchases();
  return { active: hasPremium(customerInfo), managementUrl: customerInfo.managementURL };
}

export function isPurchaseCancelled(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error
    && error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
}
