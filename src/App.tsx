import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, Clock3, Apple, Monitor, Smartphone, Activity,
  CloudSun, Compass, Heart, Home, Moon, MoreHorizontal, Music2, Pause, PawPrint, Move,
  Play, Plus, Settings2, ShieldCheck, SkipForward, Sparkles, Sun, Timer,
  Trash2, Volume2, X, Globe2, Download, Upload, Cat, Coffee, Pin
} from "lucide-react";
import { upCore, TimeService } from "./core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { pickNativeAlarmSound, previewNativeAlarmSound, stopNativeAlarmSoundPreview } from "./core/alarm-scheduler/capacitor-alarm-scheduler";
import { Temporal } from "@js-temporal/polyfill";
import type { Alarm, AlarmWithStatus, Countdown, SavedCity, SoundItem, Weekday, UpSettings } from "./core";
import MisoCompanion from "./components/MisoCompanion";
import MissionStudio from "./components/MissionStudio";
import VoiceAssistant from "./components/VoiceAssistant";
import Productivity from "./components/Productivity";
import GoogleCalendar from "./components/GoogleCalendar";

type Tab = "today" | "accounts" | "alarms" | "productivity" | "sounds" | "timer" | "world" | "countdown" | "cat" | "settings";
const nav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "accounts", label: "Accounts", icon: ShieldCheck },
  { id: "alarms", label: "Alarms", icon: AlarmClock },
  { id: "productivity", label: "Productivity", icon: Activity },
  { id: "sounds", label: "Sounds", icon: Music2 },
  { id: "timer", label: "Timer", icon: Timer },
  { id: "world", label: "World clock", icon: Globe2 },
  { id: "countdown", label: "Countdown", icon: CalendarDays },
  { id: "cat", label: "Miso", icon: PawPrint },
  { id: "settings", label: "Settings", icon: Settings2 }
];
const days: { label: string; value: Weekday }[] = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "T", value: 4 }, { label: "F", value: 5 }, { label: "S", value: 6 }
];
const cityOptions = [
  { cityName: "Abu Dhabi", countryCode: "AE", timeZone: "Asia/Dubai" },
  { cityName: "London", countryCode: "GB", timeZone: "Europe/London" },
  { cityName: "New York", countryCode: "US", timeZone: "America/New_York" },
  { cityName: "Los Angeles", countryCode: "US", timeZone: "America/Los_Angeles" },
  { cityName: "Toronto", countryCode: "CA", timeZone: "America/Toronto" },
  { cityName: "Vancouver", countryCode: "CA", timeZone: "America/Vancouver" },
  { cityName: "Mexico City", countryCode: "MX", timeZone: "America/Mexico_City" },
  { cityName: "São Paulo", countryCode: "BR", timeZone: "America/Sao_Paulo" },
  { cityName: "Paris", countryCode: "FR", timeZone: "Europe/Paris" },
  { cityName: "Berlin", countryCode: "DE", timeZone: "Europe/Berlin" },
  { cityName: "Rome", countryCode: "IT", timeZone: "Europe/Rome" },
  { cityName: "Madrid", countryCode: "ES", timeZone: "Europe/Madrid" },
  { cityName: "Istanbul", countryCode: "TR", timeZone: "Europe/Istanbul" },
  { cityName: "Cairo", countryCode: "EG", timeZone: "Africa/Cairo" },
  { cityName: "Johannesburg", countryCode: "ZA", timeZone: "Africa/Johannesburg" },
  { cityName: "Nairobi", countryCode: "KE", timeZone: "Africa/Nairobi" },
  { cityName: "Mumbai", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { cityName: "Bangkok", countryCode: "TH", timeZone: "Asia/Bangkok" },
  { cityName: "Singapore", countryCode: "SG", timeZone: "Asia/Singapore" },
  { cityName: "Hong Kong", countryCode: "HK", timeZone: "Asia/Hong_Kong" },
  { cityName: "Manila", countryCode: "PH", timeZone: "Asia/Manila" },
  { cityName: "Seoul", countryCode: "KR", timeZone: "Asia/Seoul" },
  { cityName: "Tokyo", countryCode: "JP", timeZone: "Asia/Tokyo" },
  { cityName: "Sydney", countryCode: "AU", timeZone: "Australia/Sydney" },
  { cityName: "Melbourne", countryCode: "AU", timeZone: "Australia/Melbourne" },
  { cityName: "Auckland", countryCode: "NZ", timeZone: "Pacific/Auckland" }
];
const resultValue = <T,>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const pad = (n: number) => String(n).padStart(2, "0");
const formatTime = (date: Date, timeFormat: "12h" | "24h" = "12h") => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: timeFormat === "12h" });
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
type InstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [moreOpen, setMoreOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [misoCue, setMisoCue] = useState("welcome");
  const [now, setNow] = useState(new Date());
  const [alarms, setAlarms] = useState<AlarmWithStatus[]>([]);
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [recentSoundIds, setRecentSoundIds] = useState<string[]>([]);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [deviceSoundTitle, setDeviceSoundTitle] = useState("");
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [settings, setSettings] = useState<UpSettings>({ catName: "Miso", motivationStyle: "direct", reducedMotion: false, wakeReason: "", pinnedCountdownId: null, timeFormat: "12h" });
  const [capabilities, setCapabilities] = useState<{ platform: string; nativeAlarmSupported: boolean; permissionGranted: boolean; notes: string[] } | null>(null);
  const [modal, setModal] = useState<"alarm" | "countdown" | "city" | null>(null);
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(5 * 60);
  const [timerDurationSeconds, setTimerDurationSeconds] = useState(5 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerLabel, setTimerLabel] = useState("Focus timer");
  const [timerSoundId, setTimerSoundId] = useState("device-alarm");
  const [notifiedTimerIds, setNotifiedTimerIds] = useState<string[]>([]);
  const [timerRecords, setTimerRecords] = useState<Array<{ id: string; label: string; endsAt: string; paused: boolean }>>([]);
  const [search, setSearch] = useState("");
  const [soundCategory, setSoundCategory] = useState("All");
  const [alarmForm, setAlarmForm] = useState({
    label: "Wake up", hour: "07", minute: "00", repeatDays: [] as Weekday[],
    timeZone, soundId: "alarm-twinbell", volume: 0.9, gradualVolume: true,
    vibration: true, snoozeMinutes: 8, mission: null as Alarm["mission"]
  });
  const [countForm, setCountForm] = useState({ title: "", date: "", time: "09:00", timeZone });
  const [cityChoice, setCityChoice] = useState("Europe/London");
  const [citySearch, setCitySearch] = useState("");
  const [alarmTimeZoneSearch, setAlarmTimeZoneSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [a, s, c, d, prefs, caps, recent, timerList] = await Promise.all([
        upCore.alarms.list(), upCore.sounds.list(), upCore.worldClock.list(),
        upCore.countdowns.list(), upCore.settings.get(), upCore.alarms.getCapabilities(), upCore.sounds.recentlyUsed(), upCore.timers.list()
      ]);
      setAlarms(resultValue(a)); setSounds(resultValue(s)); setRecentSoundIds(resultValue(recent)); setTimerRecords(resultValue(timerList)); setCities(resultValue(c));
      setCountdowns(resultValue(d)); setSettings(resultValue(prefs));
      if (caps.ok) setCapabilities(caps.value);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong loading UP."); }
  }, []);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const installed = () => { setInstallPrompt(null); setInstallOpen(false); setNotice("UP was installed on this device."); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed); };
  }, []);
  const installUP = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    setInstallOpen(true);
  };
  useEffect(() => {
    let listener: { remove: () => Promise<void> } | undefined;
    void LocalNotifications.addListener("localNotificationActionPerformed", action => {
      const extra = action.notification.extra as { type?: string } | undefined;
      if (extra?.type !== "up-streak-checkin") return;
      const key = "up.productivity.v1";
      try {
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        const today = new Date();
        const date = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const next = Array.isArray(current) ? current : [];
        next.push({ id: crypto.randomUUID(), date, label: "Completed one-hour check-in", source: "manual" });
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event("up:streak-checkin"));
        setNotice("Check-in confirmed. Your streak has been updated.");
        setTab("productivity");
      } catch { setError("UP could not save that streak check-in on this device."); }
    }).then(value => { listener = value; });
    return () => { void listener?.remove(); };
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => {
    const syncOnReturn = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", syncOnReturn);
    document.addEventListener("visibilitychange", syncOnReturn);
    return () => { window.removeEventListener("focus", syncOnReturn); document.removeEventListener("visibilitychange", syncOnReturn); };
  }, [refresh]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    const root = document.documentElement;
    let activeTilt: HTMLElement | null = null;
    let activeMagnetic: HTMLElement | null = null;
    const clearTilt = () => {
      if (!activeTilt) return;
      activeTilt.style.setProperty("--tilt-x", "0deg");
      activeTilt.style.setProperty("--tilt-y", "0deg");
      activeTilt = null;
    };
    const clearMagnetic = () => {
      if (!activeMagnetic) return;
      activeMagnetic.style.setProperty("--mag-x", "0px");
      activeMagnetic.style.setProperty("--mag-y", "0px");
      activeMagnetic = null;
    };
    const move = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${(event.clientX / Math.max(1, window.innerWidth)) * 100}%`);
      root.style.setProperty("--pointer-y", `${(event.clientY / Math.max(1, window.innerHeight)) * 100}%`);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      const tilt = target?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt) {
        if (activeTilt && activeTilt !== tilt) clearTilt();
        activeTilt = tilt;
        const rect = tilt.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
        const y = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
        tilt.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        tilt.style.setProperty("--tilt-y", `${(x * 9).toFixed(2)}deg`);
      } else clearTilt();
      const magnetic = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnetic) {
        if (activeMagnetic && activeMagnetic !== magnetic) clearMagnetic();
        activeMagnetic = magnetic;
        const rect = magnetic.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .12;
        const y = (event.clientY - rect.top - rect.height / 2) * .12;
        magnetic.style.setProperty("--mag-x", `${x.toFixed(1)}px`);
        magnetic.style.setProperty("--mag-y", `${y.toFixed(1)}px`);
      } else clearMagnetic();
    };
    const reset = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (activeTilt && target?.closest("[data-tilt]") === activeTilt && !(event.relatedTarget instanceof Node && activeTilt.contains(event.relatedTarget))) clearTilt();
      if (activeMagnetic && target?.closest("[data-magnetic]") === activeMagnetic && !(event.relatedTarget instanceof Node && activeMagnetic.contains(event.relatedTarget))) clearMagnetic();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", reset);
    window.addEventListener("blur", clearTilt);
    window.addEventListener("blur", clearMagnetic);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", reset);
      window.removeEventListener("blur", clearTilt);
      window.removeEventListener("blur", clearMagnetic);
      clearTilt();
      clearMagnetic();
    };
  }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMoreOpen(false); };
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !target.closest(".mobile-more-menu, .mobile-nav")) setMoreOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [moreOpen]);
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (settings.reducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(node => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [tab, settings.reducedMotion]);
  useEffect(() => {
    if (!timerRunning || timerEnd === null) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimerSeconds(remaining);
      if (remaining <= 0) {
        setTimerRunning(false); setTimerEnd(null);
        if (activeTimerId) { setNotifiedTimerIds(current => current.includes(activeTimerId) ? current : [...current, activeTimerId]); void upCore.timers.cancel(activeTimerId).then(()=>refresh()); }
        setActiveTimerId(null);
        void upCore.sounds.preview(timerSoundId);
        setNotice("Timer finished. Miso says: time’s up.");
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [timerRunning, timerEnd, activeTimerId, refresh, timerSoundId]);

  useEffect(() => {
    const completed = timerRecords.filter(timer => !timer.paused && timer.id !== activeTimerId && new Date(timer.endsAt).getTime() <= now.getTime() && !notifiedTimerIds.includes(timer.id));
    if (!completed.length) return;
    setNotifiedTimerIds(current => [...current, ...completed.map(timer => timer.id)]);
    void upCore.sounds.preview(timerSoundId);
    setNotice(completed.length === 1 ? `${completed[0]!.label} is finished. Miso says: time’s up.` : `${completed.length} timers are finished. Miso says: time’s up.`);
    void Promise.all(completed.map(timer => upCore.timers.cancel(timer.id))).then(() => refresh());
  }, [now, timerRecords, activeTimerId, notifiedTimerIds, timerSoundId, refresh]);

  const nextAlarm = useMemo(() => alarms.filter(x => x.alarm.enabled && x.nextOccurrence).sort((a,b) => (a.nextOccurrence ?? "").localeCompare(b.nextOccurrence ?? ""))[0], [alarms]);
  const soundCategories = ["All", ...Array.from(new Set(sounds.map(sound => sound.category)))];
  const filteredSounds = sounds.filter(s => (soundCategory === "All" || s.category === soundCategory) && `${s.title} ${s.category}`.toLowerCase().includes(search.toLowerCase()));
  const localDate = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const alarmTimePreview = TimeService.previewAlarm({ hour: Number(alarmForm.hour), minute: Number(alarmForm.minute), repeatDays: alarmForm.repeatDays, timeZone: alarmForm.timeZone });
  const countdownMinDate = new Intl.DateTimeFormat("en-CA", { timeZone: countForm.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

  const openNewAlarm = () => {
    setEditing(null);
    setDeviceSoundTitle("");
    setAlarmTimeZoneSearch("");
    setAlarmForm({ label: "Wake up", hour: "07", minute: "00", repeatDays: [], timeZone, soundId: "alarm-twinbell", volume: 1, gradualVolume: false, vibration: true, snoozeMinutes: 8, mission: { kind: "random", difficulty: "hard", rounds: 3 } });
    setModal("alarm");
  };
  const openEditAlarm = (alarm: Alarm) => {
    setEditing(alarm);
    setDeviceSoundTitle("");
    setAlarmTimeZoneSearch("");
    setAlarmForm({ label: alarm.label, hour: pad(alarm.hour), minute: pad(alarm.minute), repeatDays: alarm.repeatDays, timeZone: alarm.timeZone, soundId: alarm.soundId, volume: alarm.volume, gradualVolume: alarm.gradualVolume, vibration: alarm.vibration, snoozeMinutes: alarm.snoozeMinutes, mission: alarm.mission ?? { kind: "random", difficulty: "hard", rounds: 3 } });
    setModal("alarm");
  };
  const saveAlarm = async () => {
    try {
      const input = { label: alarmForm.label.trim() || "Alarm", enabled: true, hour: Number(alarmForm.hour), minute: Number(alarmForm.minute), repeatDays: alarmForm.repeatDays, timeZone: alarmForm.timeZone, soundId: alarmForm.soundId, volume: alarmForm.volume, gradualVolume: alarmForm.gradualVolume, vibration: alarmForm.vibration, snoozeMinutes: alarmForm.snoozeMinutes, mission: alarmForm.mission ?? { kind: "random", difficulty: "hard", rounds: 3 } };
      const r = editing ? await upCore.alarms.update(editing.id, input) : await upCore.alarms.create(input);
      const saved = resultValue(r);
      setModal(null); await refresh(); setMisoCue(`alarm-created-${Date.now()}`);
      setNotice(saved.scheduleState === "scheduled" ? "Alarm saved and scheduled on this device." : "Alarm saved. It will ring while UP is open in this browser.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save alarm."); }
  };
  const requestAlarmPermission = async () => { const r = await upCore.alarms.requestAlarmPermission(); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice(r.value.permissionGranted ? "Alarm permissions are ready." : (r.value.notes[0] || "Finish enabling alarm permissions in device settings.")); } };
  const testNativeAlarm = async () => { const r = await upCore.alarms.testAlarm(); if (!r.ok) setError(r.error.message); else setNotice("A one-minute native test alarm is scheduled. Keep this device powered on."); };
  const toggleAlarm = async (item: AlarmWithStatus) => {
    const r = await upCore.alarms.setEnabled(item.alarm.id, !item.alarm.enabled);
    if (!r.ok) setError(r.error.message); else { await refresh(); setNotice(item.alarm.enabled ? "Alarm switched off." : "Alarm switched on."); }
  };
  const deleteAlarm = async (id: string) => { const r = await upCore.alarms.remove(id); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice("Alarm deleted."); } };
  const addCountdown = async () => {
    try {
      if (!countForm.date || !countForm.title.trim()) throw new Error("Add a title and target date first.");
      const [year = 0, month = 0, day = 0] = countForm.date.split("-").map(Number);
      const [hour = 0, minute = 0] = countForm.time.split(":").map(Number);
      const targetInstant = Temporal.ZonedDateTime.from({ timeZone: countForm.timeZone, year, month, day, hour, minute, second: 0 }).toInstant().toString();
      resultValue(await upCore.countdowns.create({ title: countForm.title, targetInstant, timeZone: countForm.timeZone }));
      setModal(null); setCountForm({ title: "", date: "", time: "09:00", timeZone }); await refresh(); setNotice("Countdown created.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create countdown."); }
  };
  const pinCountdown = async (id: string) => {
    const next = settings.pinnedCountdownId === id ? null : id;
    const result = await upCore.settings.update({ pinnedCountdownId: next });
    if (!result.ok) setError(result.error.message); else { await refresh(); setNotice(next ? "Countdown pinned to Today." : "Countdown unpinned."); }
  };
  const deleteCountdown = async (id: string) => {
    const result = await upCore.countdowns.remove(id);
    if (!result.ok) setError(result.error.message);
    else {
      if (settings.pinnedCountdownId === id) await upCore.settings.update({ pinnedCountdownId: null });
      await refresh();
    }
  };
  const addCity = async () => {
    const city = cityOptions.find(c => c.timeZone === cityChoice);
    if (!city) return;
    const r = await upCore.worldClock.add(city);
    if (!r.ok) setError(r.error.message); else { setModal(null); await refresh(); }
  };
  const pickDeviceSound = async () => {
    try {
      const existingUri = alarmForm.soundId.startsWith("android-ringtone:") ? alarmForm.soundId.slice("android-ringtone:".length) : undefined;
      const picked = await pickNativeAlarmSound(existingUri);
      if (!picked.supported) { setNotice("The system sound picker is currently available in the Android app. iPhone uses its own AlarmKit system sound."); return; }
      if (picked.cancelled || !picked.uri) return;
      setAlarmForm(current => ({ ...current, soundId: `android-ringtone:${picked.uri}` }));
      setDeviceSoundTitle(picked.title || "Device alarm sound");
      setNotice(`Selected ${picked.title || "device alarm sound"}. It will play from Android when this alarm rings.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open Android alarm sounds."); }
  };
  const playSound = async (id: string) => {
    if (id.startsWith("android-ringtone:")) { setNotice("This tone is played by Android at alarm time. Preview it in the system sound picker."); return; }
    if (playingSoundId === id) { upCore.sounds.stopPreview(); void stopNativeAlarmSoundPreview(); setPlayingSoundId(null); return; }
    let nativePreview = false;
    if (id.startsWith("classic-") || id.startsWith("alarm-") || id === "device-alarm") {
      try { nativePreview = await previewNativeAlarmSound(id); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not preview this sound."); return; }
    }
    if ((id.startsWith("classic-") || id === "device-alarm") && !nativePreview) { setNotice("This is a native alarm sound. Preview it in the Android app or choose an alarm tone from your device."); return; }
    const r = nativePreview ? { ok: true as const, value: undefined } : await upCore.sounds.preview(id);
    if (!r.ok) setError(r.error.message);
    else { setPlayingSoundId(id); const item = sounds.find(sound => sound.id === id); window.setTimeout(() => { setPlayingSoundId(current => current === id ? null : current); if (id.startsWith("classic-") || id.startsWith("alarm-") || id === "device-alarm") void stopNativeAlarmSoundPreview(); }, (item?.durationSeconds ?? 30) * 1000); const recent = await upCore.sounds.recentlyUsed(); if (recent.ok) setRecentSoundIds(recent.value); }
  };
  const importSound = async (file?: File) => {
    if (!file) return;
    const r = await upCore.sounds.importCustom(file);
    if (!r.ok) setError(r.error.message);
    else { await refresh(); setNotice("Your sound is in the library on this device."); }
  };
  const removeCustomSound = async (id: string) => {
    const r = await upCore.sounds.removeCustom(id);
    if (!r.ok) setError(r.error.message);
    else { if (playingSoundId === id) { upCore.sounds.stopPreview(); setPlayingSoundId(null); } await refresh(); setNotice("Custom sound removed."); }
  };
  const toggleFavourite = async (sound: SoundItem) => { const r = await upCore.sounds.setFavourite(sound.id, !sound.isFavourite); if (!r.ok) setError(r.error.message); else await refresh(); };
  const startTimer = async () => {
    if (timerSeconds <= 0) return;
    if (activeTimerId) {
      const resumed = await upCore.timers.resume(activeTimerId);
      if (!resumed.ok) { setError(resumed.error.message); return; }
    } else {
      const created = await upCore.timers.start(timerSeconds * 1000, timerLabel);
      if (!created.ok) { setError(created.error.message); return; }
      setActiveTimerId(created.value.id);
    }
    setTimerEnd(Date.now() + timerSeconds * 1000);
    setTimerRunning(true);
    await refresh();
  };
  const pauseTimer = async () => {
    if (timerEnd) setTimerSeconds(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
    setTimerRunning(false); setTimerEnd(null);
    if (activeTimerId) { const paused = await upCore.timers.pause(activeTimerId); if (!paused.ok) setError(paused.error.message); }
    await refresh();
  };
  const resetTimer = async () => {
    setTimerRunning(false); setTimerEnd(null); setTimerSeconds(300); setTimerDurationSeconds(300);
    if (activeTimerId) await upCore.timers.cancel(activeTimerId);
    setActiveTimerId(null); await refresh();
  };
  const addParallelTimer = async () => {
    const created = await upCore.timers.start(timerSeconds * 1000, timerLabel);
    if (!created.ok) setError(created.error.message);
    else { await refresh(); setNotice("Another timer is running independently."); }
  };
  const controlSavedTimer = async (timer: { id: string; paused: boolean; endsAt: string }) => {
    const result = timer.paused ? await upCore.timers.resume(timer.id) : await upCore.timers.pause(timer.id);
    if (!result.ok) { setError(result.error.message); return; }
    if (timer.id === activeTimerId) {
      if (timer.paused) { setTimerEnd(Date.now() + timerSeconds * 1000); setTimerRunning(true); }
      else { setTimerSeconds(Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - Date.now()) / 1000))); setTimerEnd(null); setTimerRunning(false); }
    }
    await refresh();
  };
  const chooseTimerDuration = async (seconds: number) => {
    if (activeTimerId) await upCore.timers.cancel(activeTimerId);
    setActiveTimerId(null); setTimerRunning(false); setTimerEnd(null); setTimerSeconds(seconds); setTimerDurationSeconds(seconds);
    await refresh();
  };
  const deleteSavedTimer = async (id: string) => { const result = await upCore.timers.cancel(id); if (!result.ok) setError(result.error.message); else { if (activeTimerId === id) { setActiveTimerId(null); setTimerRunning(false); setTimerEnd(null); } await refresh(); } };
  const exportBackup = async () => { const r = await upCore.backup.export(); if (!r.ok) return setError(r.error.message); const blob = new Blob([r.value], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "up-backup.json"; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1500); setNotice("Backup saved to your downloads. Nothing was uploaded."); };
  const importBackup = async (file?: File) => { if (!file) return; const confirmed = window.confirm("Restore this UP backup? It will replace the alarms, timers, countdowns, world clocks, settings, favourites and custom sounds currently stored on this device."); if (!confirmed) return; const r = await upCore.backup.import(await file.text()); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice("Backup restored on this device."); } };

  return <div className="app-shell" data-reduced-motion={settings.reducedMotion}>
    <header className="studio-nav">
      <button className="studio-brand" onClick={() => setTab("today")} aria-label="UP home"><span>u<span>p</span></span><small>TIME, REIMAGINED</small></button>
      <nav className="studio-links" aria-label="Main navigation">{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`studio-link ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><Icon size={15}/><span>{item.label === "World clock" ? "World" : item.label}</span>{item.id === "alarms" && alarms.length > 0 && <i>{alarms.length}</i>}</button>; })}</nav>
      <div className="studio-nav-end"><button className="outline-btn account-login-top" onClick={() => setTab("accounts")}><ShieldCheck size={14}/> Google login</button><span className="studio-live"><i/> LOCAL / LIVE</span><button className="install-top-btn" onClick={()=>void installUP()}><Download size={14}/> {installPrompt ? "Install app" : "Install"}</button></div>
    </header>
    <main className="main-area">
      <div className="studio-date-line"><span>{localDate.toUpperCase()}</span><span className="studio-date-rule"/><span>{timeZone.replaceAll("_", " ").toUpperCase()}</span><span className="studio-date-rule"/><span>YOUR TIME, YOUR TERMS</span></div>
      {(notice || error) && <div className={`toast ${error ? "toast-error" : ""}`}><span className="toast-mark">{error ? "!" : "✦"}</span><span>{error || notice}</span><button onClick={() => { setNotice(""); setError(""); }}><X size={14}/></button></div>}
      <div className="page-content">
        {tab === "today" && <section className="today-page">
          <div className="eyebrow"><span className="live-dot"/> TODAY · {new Intl.DateTimeFormat([], { weekday: "long" }).format(now).toUpperCase()}</div>
          <div className="today-hero" data-reveal>
            <div className="hero-copy"><p className="serif-kicker">{localDate}</p><h1>Today<span className="heading-dot">.</span></h1><div className="hero-time">{formatTime(now, settings.timeFormat)}<span>{timeZone.replaceAll("_", " ")}</span></div><p className="hero-note">{settings.wakeReason || (nextAlarm ? `Next up: ${nextAlarm.alarm.label}` : "Nothing scheduled yet. You have room to breathe.")}</p><button className="primary-btn" data-magnetic onClick={openNewAlarm}><Plus size={17}/> Set an alarm <ArrowUpRight size={15}/></button></div>
            <button type="button" className="today-side-panel" data-tilt onClick={() => nextAlarm ? openEditAlarm(nextAlarm.alarm) : openNewAlarm()}>
              <span className="today-side-head"><span className="eyebrow">NEXT WAKE-UP</span><span className="live-dot"/></span>
              <strong className="today-side-time">{nextAlarm ? formatTime(new Date(nextAlarm.nextOccurrence!), settings.timeFormat) : "Not set"}</strong>
              <span className="today-side-label">{nextAlarm ? nextAlarm.alarm.label : "Add your first alarm"}</span>
              <span className="today-side-meta">{nextAlarm ? countdownLabel(nextAlarm.nextOccurrence!, now) + " from now" : "Tap to create an alarm"}</span>
              <span className="today-side-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
            </button>
          </div>
          <div className="section-heading" data-reveal><div><span className="eyebrow">A LITTLE STRUCTURE</span><h2>Coming up</h2></div><button className="text-btn" onClick={() => setTab("alarms")}>All alarms <ArrowUpRight size={14}/></button></div>
          {nextAlarm ? <div className="next-card" data-reveal data-tilt><div className="next-icon"><AlarmClock size={21}/></div><div className="next-main"><span className="eyebrow">NEXT ALARM · {nextAlarm.alarm.timeZone}</span><strong>{formatTime(new Date(nextAlarm.nextOccurrence!), settings.timeFormat)}</strong><span>{nextAlarm.alarm.label} · {nextAlarm.scheduleState === "scheduled" ? "Scheduled on device" : "Saved in UP only"}</span></div><div className="next-count"><span>UP NEXT IN</span><strong>{countdownLabel(nextAlarm.nextOccurrence!, now)}</strong></div><button className="icon-btn" onClick={() => openEditAlarm(nextAlarm.alarm)}><ArrowUpRight size={18}/></button></div> : <div className="empty-next" data-reveal><div className="empty-sun"><Sun/></div><div><strong>No alarms on the horizon.</strong><span>Set one when you're ready to make a plan.</span></div><button className="outline-btn" onClick={openNewAlarm}>Create an alarm <Plus size={15}/></button></div>}
          {countdowns.find(c=>c.id===settings.pinnedCountdownId) && <div className="pinned-countdown"><span className="eyebrow">PINNED FOR LATER</span><div><strong>{countdowns.find(c=>c.id===settings.pinnedCountdownId)!.title}</strong><span>{countdownLabel(countdowns.find(c=>c.id===settings.pinnedCountdownId)!.targetInstant,now)} to go</span></div><button onClick={()=>setTab("countdown")}>Open countdown <ArrowUpRight size={14}/></button></div>}
          <div className="quick-grid" data-reveal><button className="quick-tile" data-tilt onClick={() => setTab("timer")}><span className="quick-icon"><Timer/></span><span><strong>Take five</strong><small>Start a little timer</small></span><ArrowUpRight size={15}/></button><button className="quick-tile" onClick={() => setTab("world")}><span className="quick-icon green"><Globe2/></span><span><strong>Elsewhere</strong><small>Check another timezone</small></span><ArrowUpRight size={15}/></button><button className="quick-tile" onClick={() => setTab("sounds")}><span className="quick-icon ochre"><Music2/></span><span><strong>Set the mood</strong><small>Find your wake-up sound</small></span><ArrowUpRight size={15}/></button></div>
        </section>}
        {tab === "alarms" && <section><div className="page-heading" data-reveal><div><span className="eyebrow">THE ART OF GETTING UP</span><h1>Your alarms<span className="heading-dot">.</span></h1><p>Make a plan. Let tomorrow-you take it from here.</p></div><button className="primary-btn" data-magnetic onClick={openNewAlarm}><Plus size={17}/> New alarm</button></div><div className="capability-banner" data-reveal><ShieldCheck size={18}/><div><strong>{capabilities?.nativeAlarmSupported ? "Native alarm engine detected" : "Web preview mode"}</strong><span>{capabilities?.notes?.[0] || "Alarms save locally. Background ringing requires the native app."}</span>{capabilities?.nativeAlarmSupported && !capabilities.permissionGranted && <button className="outline-btn" onClick={() => void requestAlarmPermission()}>Enable alarm permissions</button>}{capabilities?.nativeAlarmSupported && capabilities.permissionGranted && <button className="outline-btn" onClick={() => void testNativeAlarm()}>Test native alarm · 60 sec</button>}</div></div><div className="alarm-list" data-reveal>{alarms.length ? alarms.map(item => <div className={`alarm-row ${item.alarm.enabled ? "" : "is-disabled"}`} key={item.alarm.id}><button className={`toggle ${item.alarm.enabled ? "on" : ""}`} onClick={() => void toggleAlarm(item)} aria-label="Toggle alarm"><span/></button><button className="alarm-time-block" onClick={() => openEditAlarm(item.alarm)}><strong>{formatTime(new Date(2000, 0, 1, item.alarm.hour, item.alarm.minute), settings.timeFormat)}</strong><span>{item.alarm.label} · {item.alarm.repeatDays.length ? item.alarm.repeatDays.map(d => days[d]?.label).join(" ") : "Once"} · {item.alarm.timeZone}</span></button><div className="alarm-status"><span className={`status-dot status-${item.scheduleState}`}/>{item.scheduleState.replace("_", " ")}</div><button className="icon-btn" onClick={() => openEditAlarm(item.alarm)}><Settings2 size={17}/></button><button className="icon-btn danger-icon" onClick={() => void deleteAlarm(item.alarm.id)}><Trash2 size={16}/></button></div>) : <div className="empty-state"><AlarmClock size={28}/><h3>Quiet for now.</h3><p>Your alarms will live here. Start with one that makes tomorrow easier.</p><button className="primary-btn" data-magnetic onClick={openNewAlarm}><Plus size={16}/> Create your first alarm</button></div>}</div></section>}
        {tab === "accounts" && <section><div className="page-heading"><div><span className="eyebrow">YOUR SERVICES, IN ONE PLACE</span><h1>Accounts<span className="heading-dot">.</span></h1><p>Connect your Google account to bring your reminders and calendar into UP.</p></div></div><div className="settings-list" data-reveal><GoogleCalendar alarms={alarms}/></div></section>}
        {tab === "productivity" && <Productivity onActivityLogged={() => setNotice("Win logged. Your contribution map just grew.")}/>}
        {tab === "sounds" && <section><div className="page-heading"><div><span className="eyebrow">A BETTER WAY TO WAKE</span><h1>Sound room<span className="heading-dot">.</span></h1><p>Small soundscapes for the first moments of your day.</p></div><label className="sound-import-button"><Upload size={15}/> Add your sound<input type="file" accept="audio/*" onChange={e=>void importSound(e.target.files?.[0])}/></label></div>{recentSoundIds.length>0 && <div className="recent-sounds" data-reveal><span className="eyebrow">RECENTLY PLAYED</span><div>{recentSoundIds.map(id=>sounds.find(sound=>sound.id===id)).filter((sound): sound is SoundItem=>Boolean(sound)).map(sound=><button key={sound.id} onClick={()=>void playSound(sound.id)}>{sound.title}<Play size={12}/></button>)}</div></div>}<div className="sound-toolbar" data-reveal><div className="search-box"><Compass size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a sound or mood"/></div><span>{filteredSounds.length} SOUNDS</span></div><div className="sound-categories" data-reveal>{soundCategories.map(category=><button key={category} className={soundCategory===category?"selected":""} onClick={()=>setSoundCategory(category)}>{category}</button>)}</div><div className="sound-grid" data-reveal>{filteredSounds.map((sound,i) => <div className="sound-card" data-tilt key={sound.id}><div className={`sound-art art-${i%6}`}><div className="sound-wave"><i/><i/><i/><i/><i/><i/><i/></div><span>{sound.category.toUpperCase()}</span></div><div className="sound-info"><div><strong>{sound.title}</strong><small>{sound.durationSeconds}s preview · {sound.category}</small>{sound.attribution && <small className="sound-attribution">{sound.attribution}</small>}</div><button className="favourite-btn" onClick={() => void toggleFavourite(sound)}><Heart size={17} fill={sound.isFavourite ? "currentColor" : "none"}/></button></div><div className="sound-card-actions"><button className="sound-play" onClick={() => void playSound(sound.id)}>{playingSoundId===sound.id?<><Pause size={14}/> Stop preview</>:<><Play size={14} fill="currentColor"/> Preview sound</>}</button>{sound.source==="user" && <button className="sound-remove" onClick={()=>void removeCustomSound(sound.id)} aria-label={`Remove ${sound.title}`}><Trash2 size={14}/></button>}</div></div>)}</div><p className="fine-print">Choose a sound from Android’s own alarm-tone picker, browse the curated CC0 soundscapes, or import audio for local previews.</p></section>}
        {tab === "timer" && <section><div className="page-heading"><div><span className="eyebrow">A MOMENT, MEASURED</span><h1>Timer<span className="heading-dot">.</span></h1><p>Give one thing your full attention.</p></div></div><div className="timer-layout" data-reveal><div className="timer-face"><div className="timer-ring"><svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="132"/><circle className="timer-progress" cx="150" cy="150" r="132" style={{ strokeDashoffset: 829 * (1 - Math.min(1, timerSeconds / Math.max(1, timerDurationSeconds))) }}/></svg><div className="timer-digits">{pad(Math.floor(timerSeconds/60))}<span>:</span>{pad(timerSeconds%60)}<small>{timerRunning ? "IN PROGRESS" : "READY WHEN YOU ARE"}</small></div></div><div className="timer-controls">{timerRunning ? <button className="primary-btn" data-magnetic onClick={pauseTimer}><Pause size={16}/> Pause</button> : <button className="primary-btn" data-magnetic onClick={startTimer}><Play size={16} fill="currentColor"/> Start timer</button>}<button className="outline-btn" onClick={() => void resetTimer()}>Reset</button></div></div><div className="timer-presets"><span className="eyebrow">QUICK SETS</span><div className="timer-label-input"><label>Timer label</label><input value={timerLabel} onChange={e=>setTimerLabel(e.target.value)} placeholder="Focus timer"/></div>{[1,5,10,15,25,45].map(n => <button key={n} className={timerSeconds===n*60?"preset active":"preset"} onClick={() => void chooseTimerDuration(n*60)}><strong>{n}</strong><span>MIN</span></button>)}<div className="custom-time"><label>Custom minutes</label><input type="number" min="1" max="999" value={Math.max(1,Math.ceil(timerSeconds/60))} onChange={e => void chooseTimerDuration(Math.max(1,Number(e.target.value)||1)*60)}/></div><div className="timer-label-input"><label>Timer alert</label><div className="timer-alert-choice"><select value={timerSoundId} onChange={e=>setTimerSoundId(e.target.value)}>{sounds.map(sound=><option key={sound.id} value={sound.id}>{sound.title}</option>)}</select><button className="outline-btn" onClick={()=>void playSound(timerSoundId)}><Volume2 size={13}/> Test sound</button></div></div><button className="outline-btn add-parallel-timer" onClick={()=>void addParallelTimer()}><Plus size={14}/> Add another timer</button><p className="fine-print">Timers persist across app restarts. Web notifications while the app is closed are not guaranteed.</p><div className="parallel-timers"><span className="eyebrow">RUNNING & PAUSED TIMERS</span>{timerRecords.length ? timerRecords.map(timer=><div className="parallel-timer" key={timer.id}><div><strong>{timer.label}</strong><span>{timer.paused?"PAUSED":countdownLabel(timer.endsAt,now)}</span></div><button onClick={()=>void controlSavedTimer(timer)}>{timer.paused?"Resume":"Pause"}</button><button onClick={()=>void deleteSavedTimer(timer.id)} aria-label={`Delete ${timer.label}`}><Trash2 size={13}/></button></div>) : <small>No other timers yet.</small>}</div></div></div></section>}
        {tab === "world" && <section><div className="page-heading"><div><span className="eyebrow">SAME PLAN, DIFFERENT SKY</span><h1>Elsewhere<span className="heading-dot">.</span></h1><p>Keep the world's clocks in one little place.</p></div><button className="primary-btn" data-magnetic onClick={() => setModal("city")}><Plus size={16}/> Add a city</button></div><div className="world-local" data-reveal><div><span className="eyebrow">YOUR LOCAL TIME · {timeZone}</span><strong>{formatTime(now, settings.timeFormat)}</strong><span>{localDate}</span></div><Sun size={30}/></div><div className="city-grid" data-reveal>{cities.map(city => <div className="city-card" data-tilt key={city.id}><div><span>{city.countryCode}</span><button className="icon-btn danger-icon" onClick={async()=>{const r=await upCore.worldClock.remove(city.id); if(!r.ok)setError(r.error.message); else await refresh();}}><X size={15}/></button></div><h3>{city.cityName}</h3><strong>{new Intl.DateTimeFormat([], {timeZone:city.timeZone,hour:"numeric",minute:"2-digit"}).format(now)}</strong><span>{new Intl.DateTimeFormat([], {timeZone:city.timeZone,weekday:"long",month:"short",day:"numeric"}).format(now)}</span><small>{new Intl.DateTimeFormat("en",{timeZone:city.timeZone,timeZoneName:"longOffset"}).formatToParts(now).find(part=>part.type==="timeZoneName")?.value}</small></div>)}</div>{!cities.length && <div className="empty-state"><Globe2/><h3>Your world, on one screen.</h3><p>Add a city to start comparing local times.</p><button className="outline-btn" onClick={()=>setModal("city")}>Add a city <Plus size={15}/></button></div>}</section>}
        {tab === "countdown" && <section><div className="page-heading"><div><span className="eyebrow">SOMETHING TO LOOK FORWARD TO</span><h1>Countdowns<span className="heading-dot">.</span></h1><p>Give the good things a place on the calendar.</p></div><button className="primary-btn" data-magnetic onClick={() => setModal("countdown")}><Plus size={16}/> New countdown</button></div><div className="countdown-list" data-reveal>{countdowns.map(c => { const ms=new Date(c.targetInstant).getTime()-now.getTime(); const daysLeft=Math.max(0,Math.floor(ms/86400000)); return <div className="countdown-card" data-tilt key={c.id}><div className="countdown-number">{daysLeft}<small>DAYS</small></div><div><span className="eyebrow">{new Intl.DateTimeFormat([], {timeZone:c.timeZone,month:"long",day:"numeric",year:"numeric"}).format(new Date(c.targetInstant))}</span><h3>{c.title}</h3><p>{ms<=0?"It's here.":`${Math.floor((ms%86400000)/3600000)} hours and ${Math.floor((ms%3600000)/60000)} minutes to go`}</p></div><button className={`icon-btn ${settings.pinnedCountdownId===c.id?"pinned-icon":""}`} onClick={()=>void pinCountdown(c.id)} aria-label={settings.pinnedCountdownId===c.id?"Unpin countdown":"Pin countdown to Today"}><Pin size={16}/></button><button className="icon-btn danger-icon" onClick={()=>void deleteCountdown(c.id)}><Trash2 size={16}/></button></div>; })}</div>{!countdowns.length && <div className="empty-state"><CalendarDays/><h3>Save a date worth waiting for.</h3><p>Trips, deadlines, birthdays, first days. Whatever matters to you.</p><button className="primary-btn" data-magnetic onClick={()=>setModal("countdown")}><Plus size={16}/> Add a countdown</button></div>}</section>}
        {tab === "cat" && <section><div className="page-heading"><div><span className="eyebrow">THE LITTLE COMPANION THAT FOLLOWS YOU</span><h1>Meet {settings.catName}<span className="heading-dot">.</span></h1><p>One pixel cat. Every screen. Your space, her playground.</p></div></div><div className="cat-page cat-page-new" data-reveal><div className="cat-stage cat-stage-new"><div className="cat-stage-orbit orbit-a"/><div className="cat-stage-orbit orbit-b"/><span className="cat-stage-note">MISO IS ROAMING AROUND UP</span><div className="cat-stage-copy"><span className="eyebrow">A LIVING LITTLE PRESENCE</span><h2>She goes<br/><em>where you go.</em></h2><p>Drag the pixel cat anywhere on the screen. She follows your cursor, reacts when you tap her, and keeps the same look on every page.</p><div className="cat-stage-actions"><span><Heart size={14}/> Pet her</span><span><Sparkles size={14}/> Give a treat</span><span><Move size={14}/> Drag anywhere</span></div></div></div><div className="cat-details"><span className="eyebrow">MAKE HER YOURS</span><h2>Same Miso.<br/><em>Everywhere.</em></h2><p>Tap Miso to say hello. Use the little floating controls to pet her, give her a treat or bring the butterfly back. Grab her and move her across the whole page, between tabs, wherever you like.</p><label>What should we call your cat?</label><input className="field-input" value={settings.catName} onChange={e=>setSettings({...settings,catName:e.target.value})}/><button className="primary-btn" data-magnetic onClick={async()=>{const r=await upCore.settings.update({catName:settings.catName});if(!r.ok)setError(r.error.message);else {await refresh();setNotice("Name saved.");}}}>Save name <Check size={15}/></button></div></div></section>}
        {tab === "settings" && <section><div className="page-heading"><div><span className="eyebrow">MAKE UP FEEL LIKE YOURS</span><h1>Settings<span className="heading-dot">.</span></h1><p>Your preferences, your pace, your device.</p></div></div><div className="settings-list" data-reveal><VoiceAssistant nextAlarmAt={nextAlarm?.nextOccurrence ?? null}/><div className="setting-row"><div><strong>Time format</strong><span>Choose how times appear throughout UP.</span></div><select value={settings.timeFormat} onChange={async e=>{const v=e.target.value as "12h" | "24h";const r=await upCore.settings.update({timeFormat:v});if(!r.ok)setError(r.error.message);else await refresh();}}><option value="12h">12-hour (AM / PM)</option><option value="24h">24-hour</option></select></div><div className="setting-row"><div><strong>How should UP sound?</strong><span>Choose the tone of your morning nudges.</span></div><select value={settings.motivationStyle} onChange={async e=>{const v=e.target.value as typeof settings.motivationStyle;const r=await upCore.settings.update({motivationStyle:v});if(r.ok)await refresh();}}><option value="direct">Direct & practical</option><option value="warm">Warm & encouraging</option><option value="competitive">Challenge me</option><option value="reflective">Quiet & reflective</option></select></div><div className="setting-row"><div><strong>Your reason to get up</strong><span>A line to see on the Today screen.</span></div><input className="field-input" placeholder="Something you're looking forward to…" value={settings.wakeReason} onChange={e=>setSettings({...settings,wakeReason:e.target.value})}/><button className="outline-btn" onClick={async()=>{const r=await upCore.settings.update({wakeReason:settings.wakeReason});if(!r.ok)setError(r.error.message);else setNotice("Saved.");}}>Save</button></div><div className="setting-row"><div><strong>Reduce motion</strong><span>Keep transitions calm and minimal.</span></div><button className={`toggle ${settings.reducedMotion?"on":""}`} onClick={async()=>{const r=await upCore.settings.update({reducedMotion:!settings.reducedMotion});if(r.ok)await refresh();}}><span/></button></div><div className="setting-row backup-setting"><div><strong>Local backup</strong><span>Export or restore a file. UP does not upload this data.</span><small>Includes alarms and repeat schedules, timers, countdowns, world-clock cities, preferences, sound favourites and imported audio files. Restoring replaces the current local data.</small></div><div className="setting-actions"><button className="outline-btn" onClick={()=>void exportBackup()}><Download size={15}/> Export backup</button><label className="outline-btn upload-btn"><Upload size={15}/> Restore backup<input type="file" accept="application/json" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div></div><div className="setting-row"><div><strong>Alarm capability</strong><span>{capabilities?.platform ?? "Checking platform"} · {capabilities?.nativeAlarmSupported?"Native scheduler detected":"Web-only scheduling"}</span></div><span className="cap-pill">{capabilities?.nativeAlarmSupported?"NATIVE":"WEB PREVIEW"}</span></div></div></section>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Primary navigation">
      {nav.slice(0,4).map(item => { const Icon = item.icon; return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>{setTab(item.id);setMoreOpen(false);}} aria-current={tab===item.id?"page":undefined}><Icon size={18}/><span>{item.label}</span></button>; })}
      <button className={moreOpen || !nav.slice(0,4).some(item=>item.id===tab)?"active":""} onClick={()=>setMoreOpen(value=>!value)} aria-expanded={moreOpen} aria-haspopup="menu"><MoreHorizontal size={19}/><span>More</span></button>
    </nav>
    {moreOpen && <div className="mobile-more-menu" role="menu">{nav.slice(4).map(item=>{const Icon=item.icon;return <button role="menuitem" key={item.id} onClick={()=>{setTab(item.id);setMoreOpen(false);}}><Icon size={16}/><span>{item.label}</span>{tab===item.id&&<Check size={14}/>}</button>;})}</div>}
    <MisoCompanion name={settings.catName || "Miso"} reducedMotion={settings.reducedMotion} spotlight={tab === "cat"} cue={misoCue}/>
    {installOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setInstallOpen(false);}}><div className="modal install-modal"><div className="modal-head"><div><span className="eyebrow">NATIVE APP BUILDS</span><h2>Install UP</h2></div><button className="icon-btn" onClick={()=>setInstallOpen(false)}><X/></button></div><div className="modal-body"><div className="native-install-card"><Smartphone/><div><strong>Android · native alarm app</strong><p>Download the latest Android debug APK from the repository's Actions run, then install it on your phone. Android will ask you to allow installation from your browser or file manager.</p><a href="https://github.com/raevn45/UPbetter/actions/workflows/native-build.yml" target="_blank" rel="noreferrer">Open Android builds <ArrowUpRight size={14}/></a></div></div><div className="native-install-card"><Apple/><div><strong>iPhone · AlarmKit</strong><p>The iOS native project compiles for the simulator. A signed iPhone build still needs Apple developer signing and real-device testing before it can be installed.</p><span>Not yet distributable</span></div></div><div className="native-install-card"><Monitor/><div><strong>Windows · installable desktop app</strong><p>Use the Install button in a Chromium browser to install UP as a desktop app. It keeps the UP interface in its own window. Native Windows alarm scheduling is still being built.</p><span>{installPrompt ? "Ready to install" : "Use Chrome or Edge menu → Install UP if no prompt appears"}</span></div></div><p className="fine-print">On desktop, Chrome or Edge can install UP as a standalone app. If the install prompt is unavailable, open the browser menu and choose Install UP or Apps → Install this site as an app. Android alarms use the native Android alarm manager. They still require exact-alarm, notification and full-screen permissions. A powered-off phone cannot ring.</p></div></div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{modal==="alarm"?"MAKE A PLAN":modal==="city"?"ADD A PLACE":"MARK THE MOMENT"}</span><h2>{modal==="alarm"?(editing?"Edit alarm":"New alarm"):modal==="city"?"Add a city":"New countdown"}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div>
      {modal==="alarm" && <div className="modal-body"><label>What is this alarm for?</label><input className="field-input" value={alarmForm.label} onChange={e=>setAlarmForm({...alarmForm,label:e.target.value})} placeholder="Wake up, gym, remember…"/><div className="time-inputs"><div><label>HOUR</label><input type="number" min={settings.timeFormat === "12h" ? 1 : 0} max={settings.timeFormat === "12h" ? 12 : 23} value={settings.timeFormat === "12h" ? ((Number(alarmForm.hour)+11)%12)+1 : Number(alarmForm.hour)} onChange={e=>{const shown=Math.min(settings.timeFormat === "12h" ? 12 : 23,Math.max(settings.timeFormat === "12h" ? 1 : 0,Number(e.target.value)));const hour=settings.timeFormat === "12h" ? (shown%12)+(Number(alarmForm.hour)>=12?12:0) : shown;setAlarmForm({...alarmForm,hour:pad(hour)});}}/></div><span>:</span><div><label>MINUTE</label><input type="number" min="0" max="59" value={Number(alarmForm.minute)} onChange={e=>setAlarmForm({...alarmForm,minute:pad(Math.min(59,Math.max(0,Number(e.target.value))))})}/></div>{settings.timeFormat === "12h" && <div><label>PERIOD</label><select className="field-input" value={Number(alarmForm.hour)>=12?"PM":"AM"} onChange={e=>setAlarmForm({...alarmForm,hour:pad((Number(alarmForm.hour)%12)+(e.target.value==="PM"?12:0))})}><option>AM</option><option>PM</option></select></div>}</div><label>Repeat</label><div className="day-picker">{days.map(d=><button key={d.value} className={alarmForm.repeatDays.includes(d.value)?"selected":""} onClick={()=>setAlarmForm({...alarmForm,repeatDays:alarmForm.repeatDays.includes(d.value)?alarmForm.repeatDays.filter(x=>x!==d.value):[...alarmForm.repeatDays,d.value]})}>{d.label}</button>)}</div><label>Timezone</label><input className="field-input" value={alarmTimeZoneSearch} onChange={e=>setAlarmTimeZoneSearch(e.target.value)} placeholder="Search city or timezone"/><select className="field-input" value={alarmForm.timeZone} onChange={e=>setAlarmForm({...alarmForm,timeZone:e.target.value})}>{cityOptions.filter(c=>`${c.cityName} ${c.timeZone}`.toLowerCase().includes(alarmTimeZoneSearch.toLowerCase())).map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName} · {c.timeZone}</option>)}</select>{alarmTimePreview.ok && <div className="timezone-preview"><div><span>ALARM LOCATION</span><strong>{alarmTimePreview.value.targetTime}</strong></div><div><span>YOUR DEVICE</span><strong>{alarmTimePreview.value.deviceTime}</strong></div><p>This follows the selected location’s local clock through daylight-saving changes. The device time shown is the same actual alarm instant.</p></div>}<label>Wake-up sound</label><div className="alarm-sound-choice"><select className="field-input" value={alarmForm.soundId} onChange={e=>{setDeviceSoundTitle("");setAlarmForm({...alarmForm,soundId:e.target.value})}}>{alarmForm.soundId.startsWith("android-ringtone:") && <option value={alarmForm.soundId}>{deviceSoundTitle || "Selected device alarm tone"}</option>}{sounds.map(sound=><option key={sound.id} value={sound.id}>{sound.title}{sound.source==="user"?" · custom":""}</option>)}</select><button type="button" className="outline-btn" onClick={()=>void playSound(alarmForm.soundId)}><Play size={13}/> Preview</button></div><button type="button" className="outline-btn device-sound-picker" onClick={()=>void pickDeviceSound()}><Smartphone size={14}/> Choose a sound stored on this device</button>{alarmForm.soundId.startsWith("android-ringtone:") ? <p className="fine-print">Android will play this selected system ringtone directly when the alarm fires. iOS uses the system AlarmKit sound.</p> : sounds.find(sound=>sound.id===alarmForm.soundId)?.source==="user" && <p className="fine-print">Imported audio is available for in-app previews. Native playback of imported files is not yet supported.</p>}<div className="range-row"><label>Volume</label><input type="range" min="0" max="1" step="0.05" value={alarmForm.volume} onChange={e=>setAlarmForm({...alarmForm,volume:Number(e.target.value)})}/><span>{Math.round(alarmForm.volume*100)}%</span></div><div className="check-row"><label><input type="checkbox" checked={alarmForm.gradualVolume} onChange={e=>setAlarmForm({...alarmForm,gradualVolume:e.target.checked})}/> Gentle volume fade-in</label><label><input type="checkbox" checked={alarmForm.vibration} onChange={e=>setAlarmForm({...alarmForm,vibration:e.target.checked})}/> Vibration</label></div><MissionStudio value={alarmForm.mission} onChange={mission=>setAlarmForm({...alarmForm,mission})} onComplete={()=>setMisoCue(`mission-complete-${Date.now()}`)}/><p className="fine-print">The alarm keeps ringing until the wake-up challenge is completed. Emergency stop remains available in the ringing screen.</p><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" data-magnetic onClick={()=>void saveAlarm()}><Check size={16}/> Save alarm</button></div></div>}
      {modal==="city" && <div className="modal-body"><label>Find a city or timezone</label><input className="field-input" value={citySearch} onChange={e=>setCitySearch(e.target.value)} placeholder="Search cities, e.g. Tokyo, Paris, Mumbai"/><select className="field-input" value={cityChoice} onChange={e=>setCityChoice(e.target.value)}>{cityOptions.filter(c=>`${c.cityName} ${c.timeZone}`.toLowerCase().includes(citySearch.toLowerCase())).map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName} · {c.timeZone}</option>)}</select><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" data-magnetic onClick={()=>void addCity()}><Plus size={16}/> Add city</button></div></div>}
      {modal==="countdown" && <div className="modal-body"><label>What are we looking forward to?</label><input className="field-input" value={countForm.title} onChange={e=>setCountForm({...countForm,title:e.target.value})} placeholder="A trip, a deadline, a birthday…"/><label>Date</label><input className="field-input" type="date" min={countdownMinDate} value={countForm.date} onChange={e=>setCountForm({...countForm,date:e.target.value})}/><label>Time</label><input className="field-input" type="time" value={countForm.time} onChange={e=>setCountForm({...countForm,time:e.target.value})}/><label>Timezone</label><select className="field-input" value={countForm.timeZone} onChange={e=>setCountForm({...countForm,timeZone:e.target.value})}>{cityOptions.map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName}</option>)}</select><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" data-magnetic onClick={()=>void addCountdown()}><Check size={16}/> Save countdown</button></div></div>}
    </div></div>}
  </div>;
}

function countdownLabel(instant: string, now: Date) {
  const ms = new Date(instant).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours/24)}d ${hours%24}h`;
  return `${hours}h ${minutes}m`;
}