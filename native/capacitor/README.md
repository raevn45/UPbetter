# UP native alarm bridge

This is a first native integration layer for a Capacitor host.

## Status and limitations

- Android: exact-alarm scheduling, permission checks, boot/package-update rescheduling, alarm notifications and a basic ringing screen are scaffolded.
- iOS: AlarmKit authorization, fixed-instant scheduling, cancellation and a one-minute test alarm are scaffolded for iOS 26+.
- These sources have not been compiled or tested on physical devices. They are implementation scaffolding, not a verified release.
- iOS currently schedules the next calculated occurrence as a fixed AlarmKit alarm. It does not yet replenish an infinite series while the app remains terminated. Weekly/time-zone travel behaviour needs a supported native rescheduling design and device validation.
- Android currently uses the system alarm tone, not the selected UP sound. Notification permission UX, full-screen-intent eligibility, snooze parity and device-manufacturer testing remain.
- A powered-off phone cannot ring.

## Wiring

1. Add Capacitor to the React/Vite app and generate native projects using the Capacitor CLI.
2. Merge the Android sources into the generated Android app module, including manifest entries. Add AndroidX Core if using NotificationCompat elsewhere.
3. Add the iOS plugin to the generated Xcode app target and merge InfoPlist.additions.xml into Info.plist.
4. Add @capacitor/core to package dependencies and construct AlarmService with createAlarmScheduler() in the app service container.
5. Confirm Google Play policy eligibility for USE_EXACT_ALARM before release. If the app does not qualify, use SCHEDULE_EXACT_ALARM and implement its special-access UX.
6. Set iOS deployment target to iOS 26 for AlarmKit support.

## Physical-device test matrix

Grant/deny permissions; revoke exact-alarm access; lock the screen; force-close the app; enable battery saver; reboot and update Android; test DST and timezone changes; test one-time and weekly alarms; test multiple simultaneous alarms; cancel alarms; verify ringtone and full-screen presentation; test iOS authorization denial and device restart.

Never show “Scheduled” unless the native OS scheduling call succeeds.
