# UP: implemented features and build plan

This file is the source-of-truth feature inventory. "Implemented" means code exists; it does not mean every operating system or device has passed real-device QA.

## Implemented in the current app

### Time and alarms
- Create, edit, enable, disable and delete alarms.
- Repeating alarms, local time-zone scheduling and daylight-saving-aware time calculations.
- Per-alarm sound, volume, gradual volume and vibration settings.
- Wake-up missions/challenges. The intended ringing flow requires challenge completion; emergency stop remains available.
- Native Android alarm bridge, alarm activity, device sound picker and bundled generated alarm tones.
- iOS AlarmKit project/bridge work exists, but iPhone distribution and real-device behaviour still need signing and device testing.
- Web alarms are not reliable after the browser is closed or the device sleeps.

### Sound
- Bundled alarm tones: Twin Bell, Digital Beeps, Classic Buzzer, Pulse Alarm and Rising Alarm.
- Ambient sound library, favourites, recent sounds and local custom-audio import.
- Web audio previews and Android native sound preview/playback paths.
- Imported custom audio is not yet supported as native alarm playback on every platform.

### Time tools
- Focus/countdown timers, multiple saved timers, pause/resume and timer labels.
- Countdown events with time zones and optional pinning to Today.
- World clock with saved cities.

### Miso
- Pixel-cat companion with coat options, pet/treat interactions and butterfly toggle.
- Remembers position and coat locally.
- Autonomous roaming was added; manual move-to-corner control removed.
- Reduced-motion preference can disable roaming.

### Settings and data
- Motivation style, wake-up reason and reduced-motion preference.
- Local backup export and restore.
- Data remains on the device for the existing local-first features.

### Voice assistant (first implementation)
- Enable/disable toggle.
- Foreground browser speech recognition for supported browsers.
- Recognises sleep-time questions and speaks the remaining time using device text-to-speech.
- Optional recorded greeting in the user's own voice, played before the generated device-voice answer.
- Not a cloned voice; not a guaranteed screen-locked/background assistant.

### Productivity
- Local daily activity log, current and best streak, and a 12-week contribution grid.
- Manual check-ins and deletion of individual activity entries.

## Remaining work

### Platform reliability
- Finish and test Android native builds on real devices: exact alarm permission, notifications, full-screen intent, boot/reboot rescheduling, audio focus/looping, battery restrictions and challenge completion.
- Finish iOS native alarm scheduling and challenge UI, then test on signed physical iPhones. iOS custom alarm audio is constrained by AlarmKit and Apple platform rules.
- Build a real Windows alarm client/service with startup and notification behaviour. The current web app is not a reliable closed-browser Windows alarm.
- Add capability checks so each UI control is shown only where the platform can actually perform it.

### Voice
- Android screen-locked listening needs a native foreground microphone service, persistent notification, microphone permission and battery-policy handling. This is opt-in and must be visibly active.
- iOS does not permit arbitrary always-on background microphone listening for a normal app. Use supported alternatives such as Siri/App Intents/Shortcuts where available; do not claim always-on listening.
- Full user-voice speech generation requires an explicit-consent voice synthesis provider and secure server-side credentials. The current saved recording is a greeting only.
- Add privacy controls to delete the recording and disable recognition.

### Music providers
- Spotify: OAuth sign-in, provider permissions and playback integration. Playback availability depends on Spotify account/device/API rules; Premium may be required for some playback paths.
- Apple Music: MusicKit developer token, user authorisation and subscription-aware playback.
- YouTube: supported embedded/player route and policy-compliant playback. Do not promise background YouTube Music playback where the platform/API does not allow it.
- Never ask users to paste provider secrets into chat. Configure client IDs/tokens in the appropriate developer dashboards and secure deployment environment.

### Productivity and privacy
- Activity check-ins are manual. The proposed one-hour reminder and tap-to-confirm streak flow is not implemented yet.
- Consider optional encrypted cross-device sync only after a separate privacy/security design.

## Permissions policy

Request a permission only when the user activates the feature that needs it. Explain what the permission enables, show the OS prompt, handle denial, and provide a working fallback. A permission prompt by itself is not feature completion.
