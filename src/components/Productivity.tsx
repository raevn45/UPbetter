import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Flame, Plus, Trash2, Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type Win = { id: string; date: string; label: string; source: "manual" };
const STORAGE_KEY = "up.productivity.v1";
const localDay = (date = new Date()) => {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const readWins = (): Win[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is Win => item && typeof item.id === "string" && typeof item.date === "string" && typeof item.label === "string" && (item.source === "manual" || item.source === "photo")) : [];
  } catch { return []; }
};
const dateOffset = (days: number) => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() - days); return localDay(date); };

export default function Productivity({ onActivityLogged }: { onActivityLogged?: () => void }) {
  const [wins, setWins] = useState<Win[]>(readWins);
  const [draft, setDraft] = useState("");
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wins)); } catch { /* local progress remains in memory */ } }, [wins]);
  useEffect(() => {
    const update = () => setWins(readWins());
    window.addEventListener("up:streak-checkin", update);
    return () => window.removeEventListener("up:streak-checkin", update);
  }, []);
  const startOneHourCheckin = async () => {
    if (!Capacitor.isNativePlatform()) { window.alert("The one-hour reminder is available in the installed UP app so it can arrive when UP is closed."); return; }
    try {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted") { window.alert("Allow notifications for UP to schedule your one-hour check-in."); return; }
      const id = Math.floor(Date.now() % 2000000000);
      await LocalNotifications.schedule({ notifications: [{
        id, title: "Your UP check-in is ready",
        body: "Tap this notification to confirm your one-hour check-in and update your streak.",
        schedule: { at: new Date(Date.now() + 60 * 60 * 1000), allowWhileIdle: true },
        extra: { type: "up-streak-checkin" }
      }] });
      window.alert("Done. UP will remind you in one hour. Your streak changes only when you tap that notification.");
    } catch { window.alert("UP could not schedule the reminder. Check notification permissions and try again."); }
  };

  const counts = useMemo(() => wins.reduce<Record<string, number>>((map, win) => { map[win.date] = (map[win.date] || 0) + 1; return map; }, {}), [wins]);
  const today = localDay();
  const currentStreak = useMemo(() => {
    let streak = 0, offset = counts[today] ? 0 : 1;
    while (counts[dateOffset(offset)]) { streak++; offset++; }
    return streak;
  }, [counts, today]);
  const bestStreak = useMemo(() => {
    const dates = Object.keys(counts).sort();
    let best = 0, run = 0, previous = "";
    for (const date of dates) {
      const day = new Date(date + "T12:00:00");
      if (previous) {
        const prior = new Date(previous + "T12:00:00");
        const diff = Math.round((day.getTime() - prior.getTime()) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run); previous = date;
    }
    return best;
  }, [counts]);
  const days = useMemo(() => Array.from({ length: 84 }, (_, i) => {
    const offset = 83 - i, key = dateOffset(offset);
    return { key, count: counts[key] || 0, date: new Date(key + "T12:00:00") };
  }), [counts]);

  const addWin = (label: string, source: Win["source"]) => {
    const clean = label.trim();
    if (!clean) return;
    setWins(current => [...current, { id: crypto.randomUUID(), date: today, label: clean.slice(0, 140), source: "manual" }]);
    onActivityLogged?.();
  };


  return <section className="productivity-page">
    <div className="page-heading"><div><span className="eyebrow">SMALL WINS, VISIBLE OVER TIME</span><h1>Productivity<span className="heading-dot">.</span></h1><p>Build a record of showing up, one day at a time.</p></div><div className="productivity-stats"><div><Flame size={17}/><strong>{currentStreak}</strong><span>DAY STREAK</span></div><div><Activity size={17}/><strong>{bestStreak}</strong><span>BEST STREAK</span></div></div></div>
    <div className="productivity-panel contribution-panel" data-reveal>
      <div className="productivity-panel-head"><div><span className="eyebrow">YOUR CONSISTENCY MAP</span><h2>{wins.length} logged wins</h2></div><span className="productivity-period">LAST 12 WEEKS</span></div>
      <div className="contribution-grid" role="img" aria-label="Contribution grid showing daily productivity activity for the last 12 weeks">
        {days.map(day => <span key={day.key} className={`contribution-cell level-${Math.min(4, day.count)}`} title={`${day.key}: ${day.count} wins`}/>)}
      </div>
      <div className="contribution-legend"><span>LESS</span>{[0,1,2,3,4].map(level=><i key={level} className={`level-${level}`}/>)}<span>MORE</span></div>
    </div>
    <div className="productivity-panel streak-reminder-panel" data-reveal>
      <span className="eyebrow">ONE-HOUR CHECK-IN</span><h2>Give yourself an hour.</h2>
      <p>Start a reminder now. Your streak will update only when you tap the notification UP sends in one hour.</p>
      <button className="outline-btn" type="button" onClick={() => void startOneHourCheckin()}><Bell size={15}/> Start 1-hour check-in</button>
    </div>
    <div className="productivity-columns">
      <div className="productivity-panel" data-reveal>
        <span className="eyebrow">LOG A WIN</span><h2>What did you get done?</h2>
        <form className="productivity-add" onSubmit={event => { event.preventDefault(); addWin(draft, "manual"); setDraft(""); }}>
          <input className="field-input" value={draft} onChange={event => setDraft(event.target.value)} maxLength={140} placeholder="Finished a chapter, revised chemistry…" />
          <button className="primary-btn" type="submit" disabled={!draft.trim()}><Plus size={15}/> Add</button>
        </form>
      </div>
      <div className="productivity-panel recent-wins" data-reveal>
        <span className="eyebrow">RECENT ACTIVITY</span><h2>Proof you showed up.</h2>
        {wins.slice().reverse().slice(0,8).length ? wins.slice().reverse().slice(0,8).map(win => <div className="productivity-win" key={win.id}><span className="win-check"><Check size={13}/></span><div><strong>{win.label}</strong><small>{win.date} · Manual check-in</small></div><button className="icon-btn danger-icon" onClick={() => setWins(current => current.filter(item => item.id !== win.id))} aria-label="Delete activity"><Trash2 size={14}/></button></div>) : <p className="fine-print">Your first check-in will start the map.</p>}
      </div>
    </div>
  </section>;
}
