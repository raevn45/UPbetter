import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Camera, Check, Flame, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";

type Win = { id: string; date: string; label: string; source: "manual" | "photo" };
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [identified, setIdentified] = useState<{ activity: string; confidence: number; looksLikeEvidence: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wins)); } catch { /* local progress remains in memory */ } }, [wins]);

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
    setWins(current => [...current, { id: crypto.randomUUID(), date: today, label: clean.slice(0, 140), source }]);
    onActivityLogged?.();
  };
  const identifyPhoto = async (file?: File) => {
    if (!file) return;
    setIdentified(null); setPhotoMessage("");
    if (!file.type.startsWith("image/")) { setPhotoMessage("Choose an image file."); if (fileRef.current) fileRef.current.value = ""; return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoMessage("Keep the image under 8 MB."); if (fileRef.current) fileRef.current.value = ""; return; }
    setPhotoBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
        reader.onerror = () => reject(new Error("Could not read image."));
        reader.readAsDataURL(file);
      });
      const comma = dataUrl.indexOf(",");
      const imageBase64 = dataUrl.slice(comma + 1);
      const response = await fetch("/api/productivity/identify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, imageBase64 })
      });
      const result = await response.json() as { activity?: string; confidence?: number; looksLikeEvidence?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Photo identification is not available yet.");
      if (!result.activity) throw new Error("The photo could not be identified. Try another image or add a win manually.");
      setIdentified({ activity: result.activity, confidence: Number(result.confidence) || 0, looksLikeEvidence: Boolean(result.looksLikeEvidence) });
      setPhotoMessage("Identification complete. The selected image has been cleared from this screen and was not saved by UP.");
    } catch (error) {
      setPhotoMessage(error instanceof Error ? error.message : "Photo identification failed.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
    <div className="productivity-columns">
      <div className="productivity-panel" data-reveal>
        <span className="eyebrow">LOG A WIN</span><h2>What did you get done?</h2>
        <form className="productivity-add" onSubmit={event => { event.preventDefault(); addWin(draft, "manual"); setDraft(""); }}>
          <input className="field-input" value={draft} onChange={event => setDraft(event.target.value)} maxLength={140} placeholder="Finished a chapter, revised chemistry…" />
          <button className="primary-btn" type="submit" disabled={!draft.trim()}><Plus size={15}/> Add</button>
        </form>
        <div className="photo-proof">
          <div><strong><Camera size={16}/> Photo check-in</strong><span>Show a page, project or completed task. UP identifies it, then keeps only the short activity label.</span></div>
          <label className="outline-btn photo-proof-button"><Upload size={14}/> {photoBusy ? "Identifying…" : "Choose photo"}<input ref={fileRef} type="file" accept="image/*" capture="environment" disabled={photoBusy} onChange={event => void identifyPhoto(event.target.files?.[0])}/></label>
        </div>
        {photoMessage && <p className="photo-status" role="status">{photoMessage}</p>}
        {identified && <div className="identified-proof"><div><span className="eyebrow">IDENTIFIED ACTIVITY · {Math.round(identified.confidence * 100)}% CONFIDENCE</span><strong>{identified.activity}</strong></div><button className="primary-btn" disabled={!identified.looksLikeEvidence} onClick={() => { addWin(identified.activity, "photo"); setIdentified(null); setPhotoMessage("Added to your productivity map."); }}><Check size={15}/> Confirm win</button>{!identified.looksLikeEvidence && <small>Not enough visible evidence of a completed activity. Add a description manually if appropriate.</small>}</div>}
        <p className="privacy-note"><ShieldCheck size={14}/> UP does not save the photo. It is sent to the configured image-identification service for analysis; that provider's own data-retention terms still apply. Don't upload faces, IDs or private documents.</p>
      </div>
      <div className="productivity-panel recent-wins" data-reveal>
        <span className="eyebrow">RECENT ACTIVITY</span><h2>Proof you showed up.</h2>
        {wins.slice().reverse().slice(0,8).length ? wins.slice().reverse().slice(0,8).map(win => <div className="productivity-win" key={win.id}><span className="win-check"><Check size={13}/></span><div><strong>{win.label}</strong><small>{win.date} · {win.source === "photo" ? "Photo verified" : "Manual check-in"}</small></div><button className="icon-btn danger-icon" onClick={() => setWins(current => current.filter(item => item.id !== win.id))} aria-label="Delete activity"><Trash2 size={14}/></button></div>) : <p className="fine-print">Your first check-in will start the map.</p>}
      </div>
    </div>
  </section>;
}
