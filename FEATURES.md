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
- Spotify account authorisation is deferred by request; the connection screen is hidden.
- Apple Music account authorisation is deferred by request; the connection screen is hidden.
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
- Explicit microphone permission request after the user chooses Enable microphone.
- Foreground speech recognition in supported browsers.
- Answers next-alarm questions and supports voice creation and deletion of named alarms; deletion requires confirmation.
- Replies use the device text-to-speech voice. Voice cloning and own-voice modulation are out of scope.
- Screen-locked/background listening is not supported by this browser implementation.

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
- Spotify and Apple Music account authorisation screens are implemented. Configure `VITE_SPOTIFY_CLIENT_ID`, the matching Spotify redirect URI (`VITE_SPOTIFY_REDIRECT_URI`, optional if using the current app URL), and `VITE_APPLE_MUSIC_DEVELOPER_TOKEN` in the deployment environment. Add the exact redirect URI to the Spotify developer dashboard.
- Spotify playback, device selection and native alarm audio hand-off are not implemented yet. Some Spotify playback paths require Premium and an eligible active device.
- Apple Music playback and native alarm audio hand-off are not implemented yet. MusicKit requires an eligible subscription.
- YouTube account connection and its supported embedded/player route remain outstanding. Do not promise background YouTube Music playback where the platform/API does not allow it.
- Never ask users to paste provider passwords or private secrets into chat. Configure publisher-owned developer credentials in the appropriate dashboards and deployment environment.

### Productivity and privacy
- One-hour check-in reminder is available in the native app; tapping its notification records the streak check-in. Browser-only builds cannot guarantee a notification while closed.
- Consider optional encrypted cross-device sync only after a separate privacy/security design.

## Permissions policy

Request a permission only when the user activates the feature that needs it. Explain what the permission enables, show the OS prompt, handle denial, and provide a working fallback. A permission prompt by itself is not feature completion.
