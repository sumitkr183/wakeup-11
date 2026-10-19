# Wakeup 11

One person schedules a wake-up and every teammate's phone rings. The app tracks who checked in, so the admin only needs to call the few people still asleep.

Built with Expo SDK 57 (Expo Router) and Supabase.

## How the alarm works

1. The admin schedules a wake-up (`schedule_wakeup` RPC).
2. Every phone syncs and **schedules local alarms** at T, T+3, T+6 and T+9 minutes (`src/features/alarm/scheduler.ts`). They ring offline too. The phone then reports "alarm set" to the server.
3. At ring time, the member taps **I'm awake** (`mark_awake`), which cancels the remaining re-rings.
4. A `pg_cron` job (`private.dispatch_due_rings`, every minute) sends backup pushes through the Expo Push API:
   - from T, to phones that never confirmed an alarm;
   - from T+12, to anyone still asleep.
5. The admin's **Live status** screen updates through Supabase Realtime. After 10 minutes it flags who needs a phone call.

| | Android | iOS |
|---|---|---|
| Rings on silent | Yes. The alarm channel uses the ALARM audio stream. | Only while the app is open. Notification sounds follow the ringer switch. |
| Breaks through Do Not Disturb / Focus | Yes (`bypassDnd`) | Yes, with Time Sensitive notifications enabled |
| Exact timing | `USE_EXACT_ALARM` | Yes |

> **iOS limitation:** with the ringer switch on silent, an iPhone alarm notification vibrates but makes no sound. Fixing this needs Apple's AlarmKit (iOS 26+) through a native module. It plugs into `src/features/alarm/scheduler.ts` without changing any screens.

## Project layout

```
src/app/                Routes (Expo Router)
  _layout.tsx           Providers and auth guards (Stack.Protected)
  onboarding.tsx        Join with invite code, name and phone, or create a team
  (app)/                Signed-in app (one app; screens depend on role)
    index.tsx           Member home or admin home
    permissions.tsx     Alarm permission and tips
    ring/[id].tsx       Full-screen ringing screen
    schedule.tsx        Admin: schedule a wake-up
    wakeups/[id].tsx    Admin: live status
src/features/           Feature logic (alarm engine, auth, wakeups, team, devices)
src/components/ui/      Shared UI primitives
supabase/migrations/    Database schema, RLS, RPCs and cron job
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema. Either:
   - run `npx supabase login`, `npx supabase init`, `npx supabase link --project-ref <ref>`, then `npx supabase db push`; or
   - paste each file in `supabase/migrations/` into the SQL Editor, oldest first, and run it.
3. **Auth › Sign In / Providers**: turn on **Allow anonymous sign-ins** (or run `npx supabase config push`). There is no email step: each phone gets an anonymous account when it joins with an invite code, name and phone number, or creates a team.

> Anonymous accounts live on the phone. Uninstalling the app or clearing its data loses the account, so a member rejoins with the invite code. The admin can't leave or sign out, because there would be no way back in.

### 2. App config

```bash
cp .env.example .env.local   # then fill in the URL and publishable key
npm install
```

### 3. Push notifications and builds (EAS)

Push and alarm sounds need a development build. They don't work in Expo Go.

```bash
npx eas-cli@latest init                # adds the projectId the app needs for push tokens
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

- **Android:** upload an FCM V1 service account key with `npx eas-cli@latest credentials`. See [the Expo FCM guide](https://docs.expo.dev/push-notifications/fcm-credentials/).
- **iOS:** EAS creates the APNs key and enables the Time Sensitive Notifications capability during the build.

Then start the dev server with `npx expo start`.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Manual test checklist

- [ ] Admin creates a team, and a member joins with the invite code.
- [ ] **Test my alarm** with the phone locked and on silent. Android rings; iPhone banner appears.
- [ ] Schedule a wake-up 3 minutes out. The admin's Live status shows "alarm set" for each phone.
- [ ] The alarm rings. **I'm awake** stops the re-rings and the admin sees the check-in live.
- [ ] Don't check in on one phone: it re-rings at +3/+6/+9 and gets server pushes from +12.
- [ ] Cancel an upcoming wake-up: members get a notification and the local alarm is removed.
