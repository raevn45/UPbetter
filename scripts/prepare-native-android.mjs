import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const appMain = path.join(root, "android/app/src/main");
const packagePath = path.join(appMain, "java/com/up/alarm");
await mkdir(packagePath, { recursive: true });

for (const file of ["UPAlarmPlugin.kt", "UPAlarmNative.kt", "UPAlarmActivity.kt", "UPGoogleAuthPlugin.kt", "UPGoogleAuthActivity.kt"]) {
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
        registerPlugin(UPGoogleAuthPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
`);

const manifestPath = path.join(appMain, "AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");
const permissions = [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.RECORD_AUDIO",
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
        <activity android:name="com.up.alarm.UPGoogleAuthActivity" android:exported="false" />
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
if (!gradle.includes("play-services-auth")) {
  gradle = gradle.replace(/dependencies\s*\{/, match => match + "\n    implementation 'com.google.android.gms:play-services-auth:22.0.0'");
}
await writeFile(gradlePath, gradle);

// Google Play services Auth 22 requires Android 7.0 (API 24) or newer.
const variablesPath = path.join(root, "android/variables.gradle");
let variables = await readFile(variablesPath, "utf8");
if (!/minSdkVersion\s*=\s*\d+/.test(variables)) {
  throw new Error("Could not find minSdkVersion in android/variables.gradle.");
}
variables = variables.replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 24");
await writeFile(variablesPath, variables);

const sounds = [
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

function makeAlarmWav(pattern, square = false) {
  const rate = 22050;
  const chunks = [];
  for (let repeat = 0; repeat < 7; repeat++) {
    for (const [hz, onMs, offMs] of pattern) {
      const count = Math.floor(rate * onMs / 1000);
      const samples = Buffer.alloc(count * 2);
      for (let i = 0; i < count; i++) {
        const t = i / rate;
        const edge = Math.min(1, i / 220, (count - i) / 220);
        const wave = square ? (Math.sin(2 * Math.PI * hz * t) >= 0 ? 1 : -1) : Math.sin(2 * Math.PI * hz * t);
        samples.writeInt16LE(Math.round(wave * Math.max(0, edge) * 24500), i * 2);
      }
      chunks.push(samples, Buffer.alloc(Math.floor(rate * offMs / 1000) * 2));
    }
  }
  const data = Buffer.concat(chunks);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
const generatedAlarms = [
  ["up_alarm_twinbell", [[880,280,180],[660,280,180],[880,280,180],[660,280,750]]],
  ["up_alarm_digital", [[1320,180,120],[990,180,120],[1320,180,120],[990,180,750]]],
  ["up_alarm_buzzer", [[480,620,120],[480,620,120],[480,620,750]], true],
  ["up_alarm_pulse", [[740,120,120],[740,120,120],[740,120,480],[1040,240,600]]],
  ["up_alarm_rise", [[520,350,80],[660,350,80],[820,350,80],[1040,550,550]]]
];
for (const [name, pattern, square] of generatedAlarms) {
  await writeFile(path.join(rawDir, name + ".wav"), makeAlarmWav(pattern, square));
}
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
console.log("UP Android project prepared: native plugin registered, alarm receivers merged, CC0 ambience and original audible alarm tones bundled.");
