import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "ios/App/App");
const appDelegatePath = path.join(appDir, "AppDelegate.swift");
const pluginSource = await readFile(path.join(root, "native/capacitor/ios/UPAlarmPlugin.swift"), "utf8");
const bridgeSource = await readFile(path.join(root, "native/capacitor/ios/UPBridgeViewController.swift"), "utf8");
let appDelegate = await readFile(appDelegatePath, "utf8");

const stripImports = value => value.replace(/^import [^\n]+\n/gm, "");
if (!appDelegate.includes("class UPAlarmPlugin")) {
  if (!appDelegate.includes("import AlarmKit")) appDelegate = "import Foundation\nimport AlarmKit\nimport SwiftUI\n" + appDelegate;
  appDelegate += "\n\n" + stripImports(pluginSource) + "\n\n" + stripImports(bridgeSource);
}
await writeFile(appDelegatePath, appDelegate);

const storyboardPath = path.join(appDir, "Base.lproj/Main.storyboard");
let storyboard = await readFile(storyboardPath, "utf8");
if (storyboard.includes('customClass="CAPBridgeViewController"')) {
  storyboard = storyboard.replace('customClass="CAPBridgeViewController" customModule="Capacitor"',
    'customClass="UPBridgeViewController" customModule="App" customModuleProvider="target"');
  storyboard = storyboard.replace('customClass="CAPBridgeViewController"', 'customClass="UPBridgeViewController" customModule="App" customModuleProvider="target"');
}
await writeFile(storyboardPath, storyboard);

const plistPath = path.join(appDir, "Info.plist");
const additionsPath = path.join(root, "native/capacitor/ios/InfoPlist.additions.xml");
let plist = await readFile(plistPath, "utf8");
const additions = await readFile(additionsPath, "utf8");
const plistEntries = [...additions.matchAll(/<key>([^<]+)<\\/key>\\s*<string>([\\s\\S]*?)<\\/string>/g)];
for (const [, key, value] of plistEntries) {
  if (!plist.includes(`<key>${key}</key>`)) {
    plist = plist.replace("</dict>", `    <key>${key}</key>\\n    <string>${value}</string>\\n</dict>`);
  }
}
await writeFile(plistPath, plist);
console.log("UP iOS project prepared: AlarmKit plugin registered and usage description installed.");
