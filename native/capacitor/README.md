# UP native alarm bridge

UP uses Capacitor to host the same React app inside native Android and iOS projects. The app service container already creates `AlarmService(createAlarmScheduler())`, so native scheduling is selected automatically inside a Capacitor build and the honest foreground-only scheduler is used on the web.

## Android implementation

The Android bridge now includes:

- `AlarmManager.setAlarmClock` scheduling with an explicit exact-alarm permission check.
- Notification permission and Android 14+ full-screen-intent access checks.
- Boot, app-update, clock-change, date-change and timezone-change recovery.
- A full-screen ringing Activity that plays the selected bundled sound, respects volume/fade and vibration settings, supports snooze, and enforces the configured native wake challenge before Stop becomes available.
- Weekly recurrence calculated in the alarm's selected IANA timezone.
- One-time alarm records retained while ringing so the selected sound and mission are still available to the ringing Activity.

The native build workflow generates the Capacitor project and calls `scripts/prepare-native-android.mjs`. That script registers the plugin, merges the receivers and permissions, enables Java time desugaring, and downloads/transcodes the seven CC0 recordings into Android resources.

### Local Android build

Requirements: Node 20+, JDK 21, Android SDK, and FFmpeg.

```bash
npm install
npm run build
npx cap add android
node scripts/prepare-native-android.mjs
cd android
./gradlew assembleDebug
```

The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

Android exact-alarm access and notification/full-screen permissions must be granted by the user. Device manufacturers may impose additional battery restrictions. A powered-off phone cannot ring.

## iOS implementation

The iOS bridge uses Apple AlarmKit (iOS 26+). It supports:

- AlarmKit authorization and capability reporting.
- One-time fixed-instant alarms.
- Weekly recurring alarms when the alarm timezone matches the iPhone's current timezone.
- Cancellation and a one-minute native test alarm.

AlarmKit weekly schedules use the iPhone's local calendar. To avoid silently changing the meaning of a remote timezone alarm, UP reports those weekly alarms as unsupported on iOS when the selected timezone differs from the device timezone. iOS currently uses the system alarm sound; selected UP audio and the custom wake-challenge UI are not yet integrated into AlarmKit's system presentation.

The iOS build workflow generates the Capacitor project and runs `scripts/prepare-native-ios.mjs`, which registers the plugin through a custom `CAPBridgeViewController` and adds the required `NSAlarmKitUsageDescription`.

### Local iOS simulator build

Requirements: macOS with Xcode 26 or newer.

```bash
npm install
npm run build
npx cap add ios
node scripts/prepare-native-ios.mjs
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App -sdk iphonesimulator -configuration Debug \
  -derivedDataPath ios-build CODE_SIGNING_ALLOWED=NO build
```

A simulator build is not an installable signed iPhone IPA. Physical-device testing and Apple signing are still required.

## Device verification checklist

Do not label a native alarm dependable until these tests pass on real devices:

- Grant and deny exact-alarm, notification, full-screen and AlarmKit permissions.
- Lock the screen and test alarm delivery while the app is backgrounded and force-closed.
- Test one-time and weekly alarms, all repeat days, timezone changes and daylight-saving transitions.
- Test multiple simultaneous alarms, edits, disable, delete, stop and snooze.
- Reboot and update Android; verify stored alarms are restored.
- Test Android battery saver and manufacturer-specific restrictions.
- Verify selected sound, fade-in, volume, vibration and mission completion.
- Verify iOS AlarmKit authorization denial and recovery.
- Confirm no alarm is reported as scheduled unless the native OS scheduling call succeeds.

A phone that is powered off cannot ring.
