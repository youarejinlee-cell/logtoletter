# Log Planet Premium setup

The app-side subscription flow expects the following commercial setup before a production build is submitted.

## Product contract

- Free: Capture (`기록`) and Collection (`모아보기`)
- Premium: Planet (`행성`), Analysis (`분석 보기`), and Notifications (`알림`)
- Billing: annual auto-renewing subscription, KRW 8,900
- Introductory offer: 2 weeks free, then annual renewal
- Legacy cutoff: accounts created before `2026-09-13 00:00 KST`
- Legacy access: through `2026-09-27 00:00 KST`
- Legacy users may then start the regular 2-week store trial

## Store and RevenueCat identifiers

Create these before shipping. Keep the entitlement and offering identifiers exact because the app reads them at runtime.

- RevenueCat entitlement: `premium`
- RevenueCat offering: `default` (mark it as Current)
- RevenueCat package: Annual
- Suggested Apple product ID: `com.youarejinlee.logplanet.premium.annual`
- Suggested Google subscription ID: `logplanet_premium`
- Suggested Google base plan ID: `annual`

Configure the Apple and Google products as annual auto-renewing subscriptions at KRW 8,900 and attach a 2-week free trial. Import both products into the RevenueCat Annual package and attach that package to the `premium` entitlement.

## EAS environment

Add the two public RevenueCat platform SDK keys to the EAS production environment:

```sh
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value 'appl_...' --visibility sensitive
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value 'goog_...' --visibility sensitive
```

These are public SDK keys intended for app clients. Never put a RevenueCat secret API key in the app.

## Required QA

Use an iOS development build/TestFlight sandbox and a Google Play test track. Expo Go cannot complete real store purchases.

- Account created before and after the legacy cutoff
- Legacy access before and after the grace deadline
- Eligible 2-week trial and trial-ineligible account
- Successful purchase, cancellation, expiration, billing retry, and restore
- Reinstall, logout/login, and the same Supabase account on a second device
- Notification cancellation when Premium access expires
- Records remain readable in Capture and Collection after expiration
