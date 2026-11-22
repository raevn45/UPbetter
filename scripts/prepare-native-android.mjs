import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const appMain = path.join(root, "android/app/src/main");
const packagePath = path.join(appMain, "java/com/up/alarm");
await mkdir(packagePath, { recursive: true });

for (const file of ["UPAlarmPlugin.kt", "UPAlarmNative.kt", "UPAlarmActivity.kt"]) {
  const source = path.join(root, "native/capacitor/android/src/main/java/com/up/alarm", file);
  await writeFile(path.join(packagePath, file), await readFile(source));
}

const javaMain = path.join(packagePath, "MainActivity.java");
const kotlinMain = path.join(packagePath, "MainActivity.kt");
await rm(javaMain, { force: true });
await writeFile(kotlinMain, `package com.up.alarm

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(UPAlarmPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
`);

const manifestPath = path.join(appMain, "AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");
const permissions = [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.USE_FULL_SCREEN_INTENT"
];
for (const permission of permissions) {
  if (!manifest.includes(`android:name="${permission}"`)) {
    manifest = manifest.replace("<application", `<uses-permission android:name="${permission}" />\n    <application`);
  }
}
const components = `
        <receiver android:name="com.up.alarm.UPAlarmReceiver" android:exported="false" />
        <receiver android:name="com.up.alarm.UPBootReceiver" android:enabled="true" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
                <action android:name="android.intent.action.DATE_CHANGED" />
                <action android:name="android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" />
            </intent-filter>
        </receiver>
        <activity android:name="com.up.alarm.UPAlarmActivity" android:exported="false"
            android:showWhenLocked="true" android:turnScreenOn="true"
            android:excludeFromRecents="true" android:launchMode="singleTop" />
`;
if (!manifest.includes("com.up.alarm.UPAlarmReceiver")) {
  manifest = manifest.replace("</application>", components + "\n    </application>");
}
await writeFile(manifestPath, manifest);

const gradlePath = path.join(root, "android/app/build.gradle");
let gradle = await readFile(gradlePath, "utf8");
if (!gradle.includes("coreLibraryDesugaringEnabled true")) {
  gradle = gradle.replace(/compileOptions\s*\{/, match => match + "\n        coreLibraryDesugaringEnabled true");
}
if (!gradle.includes("desugar_jdk_libs")) {
  gradle = gradle.replace(/dependencies\s*\{/, match => match + "\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'");
}
await writeFile(gradlePath, gradle);

const sounds = [
  ["up_classic_twinbell", "https://raw.githubusercontent.com/gretzke/open-alarm/main/OpenAlarm/Resources/Ringtones/ringtone_classic_twinbell.caf"],
  ["up_classic_bedside", "https://raw.githubusercontent.com/gretzke/open-alarm/main/OpenAlarm/Resources/Ringtones/ringtone_classic_bedsideclock.caf"],
  ["up_classic_buzzer", "https://raw.githubusercontent.com/gretzke/open-alarm/main/OpenAlarm/Resources/Ringtones/ringtone_classic_digitalalarm.caf"],
  ["up_rain_soft", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.1.0-preview/rain-soft.wav"],
  ["up_rain_heavy", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-heavy.wav"],
  ["up_rain_tin_roof", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-tin-roof.wav"],
  ["up_rain_leaves", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/rain-leaves.wav"],
  ["up_water_stream", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/water-stream.wav"],
  ["up_water_river", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.2.0-preview/water-river.wav"],
  ["up_water_surf", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/water-surf.wav"],
  ["up_wind_breeze", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/wind-breeze.wav"],
  ["up_wind_pines", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/wind-pines.wav"],
  ["up_forest_day", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/nature-forest-day.wav"],
  ["up_nature_jungle", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/nature-jungle.wav"],
  ["up_nature_meadow", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/nature-meadow.wav"],
  ["up_fire_camp", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/fire-camp.wav"],
  ["up_fire_stove", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/fire-stove.wav"],
  ["up_cat_purr", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/animals-cat.wav"],
  ["up_animals_owl", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/animals-owl.wav"],
  ["up_animals_frogs", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/animals-frogs.wav"],
  ["up_quiet_room", "https://github.com/DNAABR/ambient-sounds-library/releases/download/v0.3.0-preview/home-air-conditioner.wav"],
  ["up_city_traffic", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/city-distant-traffic.wav"],
  ["up_space_library", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/space-library.wav"],
  ["up_texture_clock", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/texture-clock.wav"],
  ["up_travel_airplane", "https://github.com/Leminno-org/ambient-sounds-library/releases/download/v0.4.0-preview/travel-airplane.wav"]
];
const rawDir = path.join(appMain, "res/raw");
await mkdir(rawDir, { recursive: true });
for (const [name, url] of sounds) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${name}: HTTP ${response.status}`);
  const wavPath = path.join(rawDir, name + ".source.wav");
  const mp3Path = path.join(rawDir, name + ".mp3");
  await writeFile(wavPath, Buffer.from(await response.arrayBuffer()));
  const conversion = spawnSync("ffmpeg", ["-y", "-i", wavPath, "-vn", "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "96k", mp3Path], { stdio: "inherit" });
  await rm(wavPath, { force: true });
  if (conversion.status !== 0) throw new Error(`FFmpeg failed to convert ${name}`);
}
console.log("UP Android project prepared: native plugin registered, alarm receivers merged, CC0 audio bundled.");
