import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, Clock3, Apple, Monitor, Smartphone,
  CloudSun, Compass, Heart, Home, Moon, MoreHorizontal, Music2, Pause, PawPrint,
  Play, Plus, Settings2, ShieldCheck, SkipForward, Sparkles, Sun, Timer,
  Trash2, Volume2, X, Globe2, Download, Upload, Cat, Coffee
} from "lucide-react";
import { upCore } from "./core";
import type { Alarm, AlarmWithStatus, Countdown, SavedCity, SoundItem, Weekday, UpSettings } from "./core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Tab = "today" | "alarms" | "sounds" | "timer" | "world" | "countdown" | "cat" | "settings";
const nav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "alarms", label: "Alarms", icon: AlarmClock },
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
  { cityName: "Tokyo", countryCode: "JP", timeZone: "Asia/Tokyo" },
  { cityName: "Singapore", countryCode: "SG", timeZone: "Asia/Singapore" },
  { cityName: "Berlin", countryCode: "DE", timeZone: "Europe/Berlin" },
  { cityName: "Sydney", countryCode: "AU", timeZone: "Australia/Sydney" },
  { cityName: "Los Angeles", countryCode: "US", timeZone: "America/Los_Angeles" }
];
const resultValue = <T,>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const pad = (n: number) => String(n).padStart(2, "0");
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function CatPortrait({ mood = "sleepy", small = false }: { mood?: string; small?: boolean }) {
  return <div className={`cat-portrait ${small ? "cat-small" : ""} mood-${mood}`} aria-label={`Miso the cat, ${mood}`}>
    <svg viewBox="0 0 220 190" role="img" aria-hidden="true">
      <path d="M43 78 35 20Q34 10 45 17L83 45Q110 34 138 45L177 17Q188 10 185 23L177 81Q193 104 184 137Q171 174 111 176Q51 174 37 137Q27 105 43 78Z" fill="#c8a875"/>
      <path d="M51 75 45 34 76 57Q62 62 51 75ZM169 75 175 34 144 57Q158 62 169 75Z" fill="#8e5b52"/>
      <path d="M52 110Q52 82 82 82Q98 82 105 99Q111 82 137 82Q168 82 168 111Q168 146 111 151Q54 146 52 110Z" fill="#f0e6d2"/>
      <ellipse cx="82" cy="105" rx="6" ry="8" fill="#243331"/><ellipse cx="140" cy="105" rx="6" ry="8" fill="#243331"/>
      <path d="M104 119Q110 113 116 119Q110 126 104 119Z" fill="#9a5d61"/>
      <path d="M110 125Q106 134 97 131M110 125Q114 134 123 131" fill="none" stroke="#6d4b43" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M52 119 18 113M53 130 20 135M168 119 202 113M167 130 200 135" stroke="#6d6253" strokeWidth="2" strokeLinecap="round"/>
      <path d="M78 67Q110 52 142 67" fill="none" stroke="#a77c50" strokeWidth="3" strokeLinecap="round"/>
      <path d="M75 159Q110 174 145 159" fill="none" stroke="#b28b5a" strokeWidth="3" strokeLinecap="round"/>
    </svg>
    {!small && <span className="cat-name">Miso</span>}
  </div>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState("");
  const [now, setNow] = useState(new Date());
  const [alarms, setAlarms] = useState<AlarmWithStatus[]>([]);
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [settings, setSettings] = useState<UpSettings>({ catName: "Miso", motivationStyle: "direct", reducedMotion: false, wakeReason: "" });
  const [capabilities, setCapabilities] = useState<{ platform: string; nativeAlarmSupported: boolean; permissionGranted: boolean; notes: string[] } | null>(null);
  const [modal, setModal] = useState<"alarm" | "countdown" | "city" | null>(null);
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(5 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [alarmForm, setAlarmForm] = useState({
    label: "Wake up", hour: "07", minute: "00", repeatDays: [] as Weekday[],
    timeZone, soundId: "soft-bells", volume: 0.75, gradualVolume: true,
    vibration: true, snoozeMinutes: 8, mission: null as Alarm["mission"]
  });
  const [countForm, setCountForm] = useState({ title: "", date: "", time: "09:00", timeZone });
  const [cityChoice, setCityChoice] = useState("Europe/London");

  const refresh = useCallback(async () => {
    try {
      const [a, s, c, d, prefs, caps] = await Promise.all([
        upCore.alarms.list(), upCore.sounds.list(), upCore.worldClock.list(),
        upCore.countdowns.list(), upCore.settings.get(), upCore.alarms.getCapabilities()
      ]);
      setAlarms(resultValue(a)); setSounds(resultValue(s)); setCities(resultValue(c));
      setCountdowns(resultValue(d)); setSettings(resultValue(prefs));
      if (caps.ok) setCapabilities(caps.value);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong loading UP."); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  useEffect(() => {
    const syncOnReturn = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", syncOnReturn);
    document.addEventListener("visibilitychange", syncOnReturn);
    return () => { window.removeEventListener("focus", syncOnReturn); document.removeEventListener("visibilitychange", syncOnReturn); };
  }, [refresh]);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!timerRunning || timerEnd === null) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimerSeconds(remaining);
      if (remaining <= 0) { setTimerRunning(false); setTimerEnd(null); setNotice("Timer complete. Take a breath."); }
    }, 250);
    return () => window.clearInterval(id);
  }, [timerRunning, timerEnd]);

  const nextAlarm = useMemo(() => alarms.filter(x => x.alarm.enabled && x.nextOccurrence).sort((a,b) => (a.nextOccurrence ?? "").localeCompare(b.nextOccurrence ?? ""))[0], [alarms]);
  const filteredSounds = sounds.filter(s => `${s.title} ${s.category}`.toLowerCase().includes(search.toLowerCase()));
  const localDate = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const openNewAlarm = () => {
    setEditing(null);
    setAlarmForm({ label: "Wake up", hour: "07", minute: "00", repeatDays: [], timeZone, soundId: "soft-bells", volume: 0.75, gradualVolume: true, vibration: true, snoozeMinutes: 8, mission: null });
    setModal("alarm");
  };
  const openEditAlarm = (alarm: Alarm) => {
    setEditing(alarm);
    setAlarmForm({ label: alarm.label, hour: pad(alarm.hour), minute: pad(alarm.minute), repeatDays: alarm.repeatDays, timeZone: alarm.timeZone, soundId: alarm.soundId, volume: alarm.volume, gradualVolume: alarm.gradualVolume, vibration: alarm.vibration, snoozeMinutes: alarm.snoozeMinutes, mission: alarm.mission });
    setModal("alarm");
  };
  const saveAlarm = async () => {
    try {
      const input = { label: alarmForm.label.trim() || "Alarm", enabled: true, hour: Number(alarmForm.hour), minute: Number(alarmForm.minute), repeatDays: alarmForm.repeatDays, timeZone: alarmForm.timeZone, soundId: alarmForm.soundId, volume: alarmForm.volume, gradualVolume: alarmForm.gradualVolume, vibration: alarmForm.vibration, snoozeMinutes: alarmForm.snoozeMinutes, mission: alarmForm.mission };
      const r = editing ? await upCore.alarms.update(editing.id, input) : await upCore.alarms.create(input);
      const saved = resultValue(r);
      setModal(null); await refresh();
      setNotice(saved.scheduleState === "scheduled" ? "Alarm saved and scheduled on this device." : "Alarm saved in UP. Native background scheduling isn't active in this web build.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save alarm."); }
  };
  const installOnDevice = async (platform: "windows" | "android" | "iphone") => {
    setInstallHelp("");
    if (platform === "iphone") {
      setInstallHelp("On your iPhone: open this site in Safari, tap Share, choose Add to Home Screen, then tap Add. iPhone uses this manual install flow.");
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") { setInstallPrompt(null); setNotice("UP is being installed on this device."); setInstallHelp("UP is being added to your apps."); }
      else setInstallHelp("You can install UP later from your browser menu.");
      return;
    }
    if (platform === "android") setInstallHelp("On Android: open this page in Chrome, tap the three-dot menu, then choose Install app or Add to Home screen.");
    else setInstallHelp("On Windows: open this page in Microsoft Edge or Chrome. Use the install icon in the address bar, or open the browser menu and choose Apps, then Install this site as an app.");
  };
  const requestAlarmPermission = async () => { const r = await upCore.alarms.requestAlarmPermission(); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice(r.value.permissionGranted ? "Alarm permissions are ready." : (r.value.notes[0] || "Finish enabling alarm permissions in device settings.")); } };
  const toggleAlarm = async (item: AlarmWithStatus) => {
    const r = await upCore.alarms.setEnabled(item.alarm.id, !item.alarm.enabled);
    if (!r.ok) setError(r.error.message); else { await refresh(); setNotice(item.alarm.enabled ? "Alarm switched off." : "Alarm switched on."); }
  };
  const deleteAlarm = async (id: string) => { const r = await upCore.alarms.remove(id); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice("Alarm deleted."); } };
  const addCountdown = async () => {
    try {
      const targetInstant = new Date(`${countForm.date}T${countForm.time}:00`).toISOString();
      resultValue(await upCore.countdowns.create({ title: countForm.title, targetInstant, timeZone: countForm.timeZone }));
      setModal(null); setCountForm({ title: "", date: "", time: "09:00", timeZone }); await refresh(); setNotice("Countdown created.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create countdown."); }
  };
  const addCity = async () => {
    const city = cityOptions.find(c => c.timeZone === cityChoice);
    if (!city) return;
    const r = await upCore.worldClock.add(city);
    if (!r.ok) setError(r.error.message); else { setModal(null); await refresh(); }
  };
  const playSound = async (id: string) => { const r = await upCore.sounds.preview(id); if (!r.ok) setError(r.error.message); };
  const toggleFavourite = async (sound: SoundItem) => { const r = await upCore.sounds.setFavourite(sound.id, !sound.isFavourite); if (!r.ok) setError(r.error.message); else await refresh(); };
  const startTimer = () => { if (timerSeconds <= 0) return; setTimerEnd(Date.now() + timerSeconds * 1000); setTimerRunning(true); };
  const pauseTimer = () => { if (timerEnd) setTimerSeconds(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000))); setTimerRunning(false); setTimerEnd(null); };
  const exportBackup = async () => { const r = await upCore.backup.export(); if (!r.ok) return setError(r.error.message); const blob = new Blob([r.value], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "up-backup.json"; a.click(); URL.revokeObjectURL(url); setNotice("Your UP backup is ready."); };
  const importBackup = async (file?: File) => { if (!file) return; const r = await upCore.backup.import(await file.text()); if (!r.ok) setError(r.error.message); else { await refresh(); setNotice("Backup restored."); } };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setTab("today")}><span className="brand-mark">u<span>p</span></span><span className="brand-sub">MAKE ROOM FOR MORNING</span></button>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><Icon size={17}/><span>{item.label}</span>{item.id === "alarms" && alarms.length > 0 && <i>{alarms.length}</i>}</button>; })}</nav>
      <div className="sidebar-bottom">
        <div className="side-cat"><CatPortrait small/><div><strong>{settings.catName}</strong><span>your morning co-pilot</span></div><Sparkles size={15}/></div>
        <div className="local-note"><span className="live-dot"/> LOCAL FIRST <span>·</span> YOUR DATA STAYS HERE</div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">UP <span>/</span> {nav.find(n => n.id === tab)?.label.toUpperCase()}</div><div className="top-right"><span className="date-top">{localDate}</span><button className="install-top-btn" onClick={()=>{setInstallOpen(true);setInstallHelp("");}}><Download size={14}/> Get UP</button><span className="avatar">R</span></div></header>
      {(notice || error) && <div className={`toast ${error ? "toast-error" : ""}`}>{error || notice}<button onClick={() => { setNotice(""); setError(""); }}><X size={14}/></button></div>}
      <div className="page-content">
        {tab === "today" && <section className="today-page">
          <div className="eyebrow"><span className="live-dot"/> YOUR DAY, AT YOUR PACE</div>
          <div className="today-hero">
            <div className="hero-copy"><p className="serif-kicker">{localDate}</p><h1>Make today<br/><em>yours.</em></h1><div className="hero-time">{formatTime(now)}<span>{timeZone.replaceAll("_", " ")}</span></div><p className="hero-note">{settings.wakeReason || "A little more intention. A little less rush."}</p><button className="primary-btn" onClick={openNewAlarm}><Plus size={17}/> Set an alarm <ArrowUpRight size={15}/></button></div>
            <div className="hero-art"><div className="sun-disc"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><CatPortrait mood="curious"/><div className="art-caption">MISO IS ROOTING FOR YOU <span>✳</span></div></div>
          </div>
          <div className="section-heading"><div><span className="eyebrow">A LITTLE STRUCTURE</span><h2>Coming up</h2></div><button className="text-btn" onClick={() => setTab("alarms")}>All alarms <ArrowUpRight size={14}/></button></div>
          {nextAlarm ? <div className="next-card"><div className="next-icon"><AlarmClock size={21}/></div><div className="next-main"><span className="eyebrow">NEXT ALARM · {nextAlarm.alarm.timeZone}</span><strong>{formatTime(new Date(nextAlarm.nextOccurrence!))}</strong><span>{nextAlarm.alarm.label} · {nextAlarm.scheduleState === "scheduled" ? "Scheduled on device" : "Saved in UP only"}</span></div><div className="next-count"><span>UP NEXT IN</span><strong>{countdownLabel(nextAlarm.nextOccurrence!, now)}</strong></div><button className="icon-btn" onClick={() => openEditAlarm(nextAlarm.alarm)}><ArrowUpRight size={18}/></button></div> : <div className="empty-next"><div className="empty-sun"><Sun/></div><div><strong>No alarms on the horizon.</strong><span>Set one when you're ready to make a plan.</span></div><button className="outline-btn" onClick={openNewAlarm}>Create an alarm <Plus size={15}/></button></div>}
          <div className="quick-grid"><button className="quick-tile" onClick={() => setTab("timer")}><span className="quick-icon"><Timer/></span><span><strong>Take five</strong><small>Start a little timer</small></span><ArrowUpRight size={15}/></button><button className="quick-tile" onClick={() => setTab("world")}><span className="quick-icon green"><Globe2/></span><span><strong>Elsewhere</strong><small>Check another timezone</small></span><ArrowUpRight size={15}/></button><button className="quick-tile" onClick={() => setTab("sounds")}><span className="quick-icon ochre"><Music2/></span><span><strong>Set the mood</strong><small>Find your wake-up sound</small></span><ArrowUpRight size={15}/></button></div>
        </section>}
        {tab === "alarms" && <section><div className="page-heading"><div><span className="eyebrow">THE ART OF GETTING UP</span><h1>Your alarms<span className="heading-dot">.</span></h1><p>Make a plan. Let tomorrow-you take it from here.</p></div><button className="primary-btn" onClick={openNewAlarm}><Plus size={17}/> New alarm</button></div><div className="capability-banner"><ShieldCheck size={18}/><div><strong>{capabilities?.nativeAlarmSupported ? "Native alarm engine detected" : "Web preview mode"}</strong><span>{capabilities?.notes?.[0] || "Alarms save locally. Background ringing requires the native app."}</span>{capabilities?.nativeAlarmSupported && !capabilities.permissionGranted && <button className="outline-btn" onClick={() => void requestAlarmPermission()}>Enable alarm permissions</button>}</div></div><div className="alarm-list">{alarms.length ? alarms.map(item => <div className={`alarm-row ${item.alarm.enabled ? "" : "is-disabled"}`} key={item.alarm.id}><button className={`toggle ${item.alarm.enabled ? "on" : ""}`} onClick={() => void toggleAlarm(item)} aria-label="Toggle alarm"><span/></button><button className="alarm-time-block" onClick={() => openEditAlarm(item.alarm)}><strong>{pad(item.alarm.hour)}<span>:</span>{pad(item.alarm.minute)}</strong><span>{item.alarm.label} · {item.alarm.repeatDays.length ? item.alarm.repeatDays.map(d => days[d]?.label).join(" ") : "Once"} · {item.alarm.timeZone}</span></button><div className="alarm-status"><span className={`status-dot status-${item.scheduleState}`}/>{item.scheduleState.replace("_", " ")}</div><button className="icon-btn" onClick={() => openEditAlarm(item.alarm)}><Settings2 size={17}/></button><button className="icon-btn danger-icon" onClick={() => void deleteAlarm(item.alarm.id)}><Trash2 size={16}/></button></div>) : <div className="empty-state"><AlarmClock size={28}/><h3>Quiet for now.</h3><p>Your alarms will live here. Start with one that makes tomorrow easier.</p><button className="primary-btn" onClick={openNewAlarm}><Plus size={16}/> Create your first alarm</button></div>}</div></section>}
        {tab === "sounds" && <section><div className="page-heading"><div><span className="eyebrow">A BETTER WAY TO WAKE</span><h1>Sound room<span className="heading-dot">.</span></h1><p>Small soundscapes for the first moments of your day.</p></div></div><div className="sound-toolbar"><div className="search-box"><Compass size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a sound or mood"/></div><span>{filteredSounds.length} SOUNDS</span></div><div className="sound-grid">{filteredSounds.map((sound,i) => <div className="sound-card" key={sound.id}><div className={`sound-art art-${i%6}`}><div className="sound-wave"><i/><i/><i/><i/><i/><i/><i/></div><span>{sound.category.toUpperCase()}</span></div><div className="sound-info"><div><strong>{sound.title}</strong><small>{sound.durationSeconds}s preview · Original tone</small></div><button className="favourite-btn" onClick={() => void toggleFavourite(sound)}><Heart size={17} fill={sound.isFavourite ? "currentColor" : "none"}/></button></div><button className="sound-play" onClick={() => void playSound(sound.id)}><Play size={14} fill="currentColor"/> Preview sound</button></div>)}</div><p className="fine-print">These are original synthesized previews. A larger recorded library and custom audio import are planned, not included yet.</p></section>}
        {tab === "timer" && <section><div className="page-heading"><div><span className="eyebrow">A MOMENT, MEASURED</span><h1>Timer<span className="heading-dot">.</span></h1><p>Give one thing your full attention.</p></div></div><div className="timer-layout"><div className="timer-face"><div className="timer-ring"><svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="132"/><circle className="timer-progress" cx="150" cy="150" r="132" style={{ strokeDashoffset: 829 - ((timerSeconds % 60) / 60) * 829 }}/></svg><div className="timer-digits">{pad(Math.floor(timerSeconds/60))}<span>:</span>{pad(timerSeconds%60)}<small>{timerRunning ? "IN PROGRESS" : "READY WHEN YOU ARE"}</small></div></div><div className="timer-controls">{timerRunning ? <button className="primary-btn" onClick={pauseTimer}><Pause size={16}/> Pause</button> : <button className="primary-btn" onClick={startTimer}><Play size={16} fill="currentColor"/> Start timer</button>}<button className="outline-btn" onClick={() => { setTimerRunning(false); setTimerEnd(null); setTimerSeconds(300); }}>Reset</button></div></div><div className="timer-presets"><span className="eyebrow">QUICK SETS</span>{[1,5,10,15,25,45].map(n => <button key={n} className={timerSeconds===n*60?"preset active":"preset"} onClick={() => { setTimerRunning(false); setTimerEnd(null); setTimerSeconds(n*60); }}><strong>{n}</strong><span>MIN</span></button>)}<div className="custom-time"><label>Custom minutes</label><input type="number" min="1" max="999" value={Math.max(1,Math.ceil(timerSeconds/60))} onChange={e => { setTimerRunning(false); setTimerEnd(null); setTimerSeconds(Math.max(1,Number(e.target.value)||1)*60); }}/></div><p className="fine-print">This timer runs while UP is open. Background alerts need native timer integration.</p></div></div></section>}
        {tab === "world" && <section><div className="page-heading"><div><span className="eyebrow">SAME PLAN, DIFFERENT SKY</span><h1>Elsewhere<span className="heading-dot">.</span></h1><p>Keep the world's clocks in one little place.</p></div><button className="primary-btn" onClick={() => setModal("city")}><Plus size={16}/> Add a city</button></div><div className="world-local"><div><span className="eyebrow">YOUR LOCAL TIME · {timeZone}</span><strong>{formatTime(now)}</strong><span>{localDate}</span></div><Sun size={30}/></div><div className="city-grid">{cities.map(city => <div className="city-card" key={city.id}><div><span>{city.countryCode}</span><button className="icon-btn danger-icon" onClick={async()=>{const r=await upCore.worldClock.remove(city.id); if(!r.ok)setError(r.error.message); else await refresh();}}><X size={15}/></button></div><h3>{city.cityName}</h3><strong>{new Intl.DateTimeFormat([], {timeZone:city.timeZone,hour:"numeric",minute:"2-digit"}).format(now)}</strong><span>{new Intl.DateTimeFormat([], {timeZone:city.timeZone,weekday:"long",month:"short",day:"numeric"}).format(now)}</span><small>{city.timeZone}</small><span className="city-diff">{Math.round((new Date(new Intl.DateTimeFormat("en-US",{timeZone:city.timeZone,hour:"2-digit",hourCycle:"h23"}).format(now)).getHours()-now.getHours()+24)%24)}h relative hour</span></div>)}</div>{!cities.length && <div className="empty-state"><Globe2/><h3>Your world, on one screen.</h3><p>Add a city to start comparing local times.</p><button className="outline-btn" onClick={()=>setModal("city")}>Add a city <Plus size={15}/></button></div>}</section>}
        {tab === "countdown" && <section><div className="page-heading"><div><span className="eyebrow">SOMETHING TO LOOK FORWARD TO</span><h1>Countdowns<span className="heading-dot">.</span></h1><p>Give the good things a place on the calendar.</p></div><button className="primary-btn" onClick={() => setModal("countdown")}><Plus size={16}/> New countdown</button></div><div className="countdown-list">{countdowns.map(c => { const ms=new Date(c.targetInstant).getTime()-now.getTime(); const daysLeft=Math.max(0,Math.floor(ms/86400000)); return <div className="countdown-card" key={c.id}><div className="countdown-number">{daysLeft}<small>DAYS</small></div><div><span className="eyebrow">{new Date(c.targetInstant).toLocaleDateString([], {month:"long",day:"numeric",year:"numeric"})}</span><h3>{c.title}</h3><p>{ms<=0?"It's here.":`${Math.floor((ms%86400000)/3600000)} hours and ${Math.floor((ms%3600000)/60000)} minutes to go`}</p></div><button className="icon-btn danger-icon" onClick={async()=>{const r=await upCore.countdowns.remove(c.id); if(!r.ok)setError(r.error.message); else await refresh();}}><Trash2 size={16}/></button></div>; })}</div>{!countdowns.length && <div className="empty-state"><CalendarDays/><h3>Save a date worth waiting for.</h3><p>Trips, deadlines, birthdays, first days. Whatever matters to you.</p><button className="primary-btn" onClick={()=>setModal("countdown")}><Plus size={16}/> Add a countdown</button></div>}</section>}
        {tab === "cat" && <section><div className="page-heading"><div><span className="eyebrow">THE HOUSEMATE YOU DIDN'T KNOW YOU NEEDED</span><h1>Meet {settings.catName}<span className="heading-dot">.</span></h1><p>A small presence for the edges of your day.</p></div></div><div className="cat-page"><div className="cat-stage"><div className="cat-halo"/><CatPortrait mood="content"/></div><div className="cat-details"><span className="eyebrow">YOUR MORNING CO-PILOT</span><h2>Not here to nag.<br/><em>Just here.</em></h2><p>{settings.catName} is your quiet companion. No streak pressure, no guilt for sleeping in. Just a little company while you find your feet.</p><label>What should we call your cat?</label><input className="field-input" value={settings.catName} onChange={e=>setSettings({...settings,catName:e.target.value})}/><button className="primary-btn" onClick={async()=>{const r=await upCore.settings.update({catName:settings.catName});if(!r.ok)setError(r.error.message);else {await refresh();setNotice("Name saved. Miso approves.");}}}>Save name <Check size={15}/></button></div></div></section>}
        {tab === "settings" && <section><div className="page-heading"><div><span className="eyebrow">MAKE UP FEEL LIKE YOURS</span><h1>Settings<span className="heading-dot">.</span></h1><p>Your preferences, your pace, your device.</p></div></div><div className="settings-list"><div className="setting-row"><div><strong>How should UP sound?</strong><span>Choose the tone of your morning nudges.</span></div><select value={settings.motivationStyle} onChange={async e=>{const v=e.target.value as typeof settings.motivationStyle;const r=await upCore.settings.update({motivationStyle:v});if(r.ok)await refresh();}}><option value="direct">Direct & practical</option><option value="warm">Warm & encouraging</option><option value="competitive">Challenge me</option><option value="reflective">Quiet & reflective</option></select></div><div className="setting-row"><div><strong>Your reason to get up</strong><span>A line to see on the Today screen.</span></div><input className="field-input" placeholder="Something you're looking forward to…" value={settings.wakeReason} onChange={e=>setSettings({...settings,wakeReason:e.target.value})}/><button className="outline-btn" onClick={async()=>{const r=await upCore.settings.update({wakeReason:settings.wakeReason});if(!r.ok)setError(r.error.message);else setNotice("Saved.");}}>Save</button></div><div className="setting-row"><div><strong>Reduce motion</strong><span>Keep transitions calm and minimal.</span></div><button className={`toggle ${settings.reducedMotion?"on":""}`} onClick={async()=>{const r=await upCore.settings.update({reducedMotion:!settings.reducedMotion});if(r.ok)await refresh();}}><span/></button></div><div className="setting-row"><div><strong>Your data belongs to you</strong><span>Export or restore your local UP data.</span></div><div className="setting-actions"><button className="outline-btn" onClick={()=>void exportBackup()}><Download size={15}/> Export</button><label className="outline-btn upload-btn"><Upload size={15}/> Import<input type="file" accept="application/json" onChange={e=>void importBackup(e.target.files?.[0])}/></label></div></div><div className="setting-row"><div><strong>Alarm capability</strong><span>{capabilities?.platform ?? "Checking platform"} · {capabilities?.nativeAlarmSupported?"Native scheduler detected":"Web-only scheduling"}</span></div><span className="cap-pill">{capabilities?.nativeAlarmSupported?"NATIVE":"WEB PREVIEW"}</span></div></div></section>}
      </div>
      <footer className="footer"><span>UP <b>·</b> A LITTLE MORE MORNING</span><span>MADE FOR THE MOMENT BEFORE THE DAY BEGINS</span></footer>
    </main>
    <nav className="mobile-nav">{nav.slice(0,5).map(item=>{const Icon=item.icon;return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}><Icon size={18}/><span>{item.label==="World clock"?"World":item.label}</span></button>})}<button onClick={()=>setTab("settings")}><MoreHorizontal size={18}/><span>More</span></button></nav>

    {installOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setInstallOpen(false);}}><div className="modal install-modal"><div className="modal-head"><div><span className="eyebrow">TAKE UP WITH YOU</span><h2>Get UP on your device.</h2></div><button className="icon-btn" onClick={()=>setInstallOpen(false)}><X/></button></div><div className="modal-body"><p className="install-intro">Install the UP app experience on the device you use every day. Your alarms and preferences stay stored on that device.</p><div className="install-options"><button className="install-option" onClick={()=>void installOnDevice("windows")}><span className="install-option-icon"><Monitor/></span><span><strong>Windows</strong><small>Install as a desktop app</small></span><ArrowUpRight/></button><button className="install-option" onClick={()=>void installOnDevice("android")}><span className="install-option-icon"><Smartphone/></span><span><strong>Android</strong><small>Install from Chrome</small></span><ArrowUpRight/></button><button className="install-option" onClick={()=>void installOnDevice("iphone")}><span className="install-option-icon"><Apple/></span><span><strong>iPhone</strong><small>Add UP to your Home Screen</small></span><ArrowUpRight/></button></div>{installHelp && <div className="install-help" role="status">{installHelp}</div>}<p className="fine-print">This installs the web app (PWA), not the separate native alarm package. Native Android and iOS alarm builds are still being completed and tested. The web app cannot guarantee alarms while closed or suspended.</p></div></div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{modal==="alarm"?"MAKE A PLAN":modal==="city"?"ADD A PLACE":"MARK THE MOMENT"}</span><h2>{modal==="alarm"?(editing?"Edit alarm":"New alarm"):modal==="city"?"Add a city":"New countdown"}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div>
      {modal==="alarm" && <div className="modal-body"><label>What is this alarm for?</label><input className="field-input" value={alarmForm.label} onChange={e=>setAlarmForm({...alarmForm,label:e.target.value})} placeholder="Wake up, gym, remember…"/><div className="time-inputs"><div><label>HOUR</label><input type="number" min="0" max="23" value={Number(alarmForm.hour)} onChange={e=>setAlarmForm({...alarmForm,hour:pad(Math.min(23,Math.max(0,Number(e.target.value))))})}/></div><span>:</span><div><label>MINUTE</label><input type="number" min="0" max="59" value={Number(alarmForm.minute)} onChange={e=>setAlarmForm({...alarmForm,minute:pad(Math.min(59,Math.max(0,Number(e.target.value))))})}/></div></div><label>Repeat</label><div className="day-picker">{days.map(d=><button key={d.value} className={alarmForm.repeatDays.includes(d.value)?"selected":""} onClick={()=>setAlarmForm({...alarmForm,repeatDays:alarmForm.repeatDays.includes(d.value)?alarmForm.repeatDays.filter(x=>x!==d.value):[...alarmForm.repeatDays,d.value]})}>{d.label}</button>)}</div><label>Timezone</label><select className="field-input" value={alarmForm.timeZone} onChange={e=>setAlarmForm({...alarmForm,timeZone:e.target.value})}>{cityOptions.map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName} · {c.timeZone}</option>)}</select><label>Wake-up sound</label><select className="field-input" value={alarmForm.soundId} onChange={e=>setAlarmForm({...alarmForm,soundId:e.target.value})}>{sounds.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><div className="range-row"><label>Volume</label><input type="range" min="0" max="1" step="0.05" value={alarmForm.volume} onChange={e=>setAlarmForm({...alarmForm,volume:Number(e.target.value)})}/><span>{Math.round(alarmForm.volume*100)}%</span></div><div className="check-row"><label><input type="checkbox" checked={alarmForm.gradualVolume} onChange={e=>setAlarmForm({...alarmForm,gradualVolume:e.target.checked})}/> Gentle volume fade-in</label><label><input type="checkbox" checked={alarmForm.vibration} onChange={e=>setAlarmForm({...alarmForm,vibration:e.target.checked})}/> Vibration</label></div><label>Wake-up mission</label><select className="field-input" value={alarmForm.mission?.kind ?? "none"} onChange={e=>setAlarmForm({...alarmForm,mission:e.target.value==="none"?null:{kind:e.target.value as NonNullable<Alarm["mission"]>["kind"],difficulty:alarmForm.mission?.difficulty ?? "easy",rounds:alarmForm.mission?.rounds ?? 3}})}><option value="none">No mission</option><option value="math">Quick maths</option><option value="memory">Memory cards</option><option value="sequence">Repeat a sequence</option><option value="typing">Type a phrase</option><option value="logic">Logic puzzle</option><option value="checklist">Morning checklist</option><option value="movement">Gentle movement prompt</option><option value="random">Surprise me</option></select>{alarmForm.mission && <><label>Mission difficulty</label><select className="field-input" value={alarmForm.mission.difficulty} onChange={e=>setAlarmForm({...alarmForm,mission:{...alarmForm.mission!,difficulty:e.target.value as "easy"|"medium"|"hard"}})}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><label>Rounds</label><select className="field-input" value={alarmForm.mission.rounds} onChange={e=>setAlarmForm({...alarmForm,mission:{...alarmForm.mission!,rounds:Number(e.target.value)}})}><option value={1}>1 round</option><option value={3}>3 rounds</option><option value={5}>5 rounds</option></select><p className="fine-print">Mission settings are saved with this alarm. The native ringing-to-mission handoff is still being integrated.</p></>}<label>Snooze duration</label><select className="field-input" value={alarmForm.snoozeMinutes} onChange={e=>setAlarmForm({...alarmForm,snoozeMinutes:Number(e.target.value)})}><option value="5">5 minutes</option><option value="8">8 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>void saveAlarm()}><Check size={16}/> Save alarm</button></div></div>}
      {modal==="city" && <div className="modal-body"><label>Choose a timezone</label><select className="field-input" value={cityChoice} onChange={e=>setCityChoice(e.target.value)}>{cityOptions.map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName} · {c.timeZone}</option>)}</select><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>void addCity()}><Plus size={16}/> Add city</button></div></div>}
      {modal==="countdown" && <div className="modal-body"><label>What are we looking forward to?</label><input className="field-input" value={countForm.title} onChange={e=>setCountForm({...countForm,title:e.target.value})} placeholder="A trip, a deadline, a birthday…"/><label>Date</label><input className="field-input" type="date" min={new Date().toISOString().slice(0,10)} value={countForm.date} onChange={e=>setCountForm({...countForm,date:e.target.value})}/><label>Time</label><input className="field-input" type="time" value={countForm.time} onChange={e=>setCountForm({...countForm,time:e.target.value})}/><label>Timezone</label><select className="field-input" value={countForm.timeZone} onChange={e=>setCountForm({...countForm,timeZone:e.target.value})}>{cityOptions.map(c=><option key={c.timeZone} value={c.timeZone}>{c.cityName}</option>)}</select><div className="modal-foot"><button className="outline-btn" onClick={()=>setModal(null)}>Cancel</button><button className="primary-btn" onClick={()=>void addCountdown()}><Check size={16}/> Save countdown</button></div></div>}
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