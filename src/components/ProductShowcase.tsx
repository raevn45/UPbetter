import { useState } from "react";
import { AlarmClock, ArrowUpRight, AudioWaveform, Brain, Check, ChevronRight, Clock3, Heart, Play, Sparkles, Timer, Waves } from "lucide-react";
import type { AlarmWithStatus, SoundItem } from "../core/domain/types";

type Demo = "alarms" | "sound" | "missions" | "miso";
export default function ProductShowcase({ alarms, sounds, onAlarm, onSounds, onMissions }: {
  alarms: AlarmWithStatus[]; sounds: SoundItem[]; onAlarm: () => void; onSounds: () => void; onMissions: () => void;
}) {
  const [active, setActive] = useState<Demo>("alarms");
  const demos: { id: Demo; label: string; icon: typeof AlarmClock; kicker: string; title: string; description: string }[] = [
    { id: "alarms", label: "Alarms", icon: AlarmClock, kicker: "YOUR MORNING, ON PURPOSE", title: "A wake-up that fits your life.", description: "Set the time, choose your sound, decide whether tomorrow needs a nudge or a challenge." },
    { id: "sound", label: "Sound room", icon: AudioWaveform, kicker: "SOUND, NOT SIRENS", title: "Find a softer first note.", description: "Explore field recordings and original soundscapes. Preview first, favourite what feels right." },
    { id: "missions", label: "Missions", icon: Brain, kicker: "WAKE YOUR BRAIN, GENTLY", title: "A challenge you actually chose.", description: "Maths, memory, patterns or a small morning reset. See a real example before it ever rings." },
    { id: "miso", label: "Miso", icon: Heart, kicker: "A LITTLE LIFE IN THE INTERFACE", title: "Your pixel companion, everywhere.", description: "Miso watches your cursor, wanders, naps and reacts. Drag her anywhere across UP." }
  ];
  const current = demos.find(d => d.id === active)!;
  const sampleAlarm = alarms.find(a => a.alarm.enabled)?.alarm;
  const sampleSound = sounds[0];
  return <section className="product-showcase" aria-label="Explore the UP experience">
    <div className="showcase-intro"><span className="eyebrow"><span className="live-dot"/> TAKE A CLOSER LOOK</span><h2>Not another alarm app.<br/><em>A whole different start.</em></h2><p>Explore the little details before you make them part of your morning.</p></div>
    <div className="showcase-tabs" role="tablist" aria-label="Product features">
      {demos.map(d => { const Icon=d.icon; return <button key={d.id} role="tab" aria-selected={active===d.id} className={active===d.id?"active":""} onClick={()=>setActive(d.id)}><Icon size={16}/>{d.label}</button>; })}
    </div>
    <div className="showcase-stage" key={active}>
      <div className="showcase-copy"><span className="eyebrow">{current.kicker}</span><h3>{current.title}</h3><p>{current.description}</p><button className="showcase-cta" onClick={active==="alarms"?onAlarm:active==="sound"?onSounds:onMissions}>Explore {active==="sound"?"sounds":active==="miso"?"Miso":active==="missions"?"missions":"alarms"} <ArrowUpRight size={15}/></button><div className="showcase-pager"><span>0{demos.findIndex(d=>d.id===active)+1}</span><i/><span>04</span></div></div>
      <div className={`showcase-demo showcase-demo--${active}`}>
        {active==="alarms" && <div className="demo-alarm-window"><div className="demo-window-top"><span>UP / ALARM STUDIO</span><span className="demo-live">● LIVE PREVIEW</span></div><div className="demo-time">{sampleAlarm ? `${String(sampleAlarm.hour).padStart(2,"0")}:${String(sampleAlarm.minute).padStart(2,"0")}` : "07:00"}<small>{sampleAlarm?.label ?? "A new morning"} · {sampleAlarm?.timeZone ?? "Your timezone"}</small></div><div className="demo-days">{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} className={i<5?"on":""}>{d}</span>)}</div><div className="demo-settings"><span><Waves size={15}/> {sampleAlarm?.soundId ?? "Rain on the Window"}</span><span><Sparkles size={15}/> Gentle fade-in</span></div><div className="demo-footer"><span><Check size={14}/> Saved locally</span><span>01 / 04</span></div></div>}
        {active==="sound" && <div className="demo-sound-window"><div className="demo-sound-disc"><div/><div/><div/></div><span className="eyebrow">NOW PREVIEWING</span><strong>{sampleSound?.title ?? "Rain on the Window"}</strong><small>{sampleSound?.category ?? "Rain"} · CC0 soundscape</small><div className="demo-waveform">{Array.from({length:34},(_,i)=><i key={i} style={{height:`${18+Math.abs(Math.sin(i*.72))*58+(i%4)*4}px`,animationDelay:`${i*19}ms`}}/>)}</div><div className="demo-sound-controls"><button><Play size={14} fill="currentColor"/> Preview</button><span>00:08</span></div></div>}
        {active==="missions" && <div className="demo-mission-window"><div className="demo-window-top"><span>WAKE-UP MISSION</span><span>01 / 03</span></div><div className="demo-mission-icon"><Brain size={26}/></div><span className="eyebrow">QUICK THINK · EASY</span><h4>Find the next number</h4><div className="demo-sequence"><b>3</b><b>5</b><b>7</b><b>9</b><b>?</b></div><div className="demo-answer"><span>Enter your answer</span><ChevronRight size={15}/></div><small>Preview it before you choose it.</small></div>}
        {active==="miso" && <div className="demo-miso-window"><div className="miso-demo-stars">✦　·　✧　·　✦</div><div className="demo-miso-signal"><span>✦</span><i/><span>✧</span></div><span className="eyebrow">YOUR LITTLE SIDEKICK</span><strong>Miso is roaming around UP.</strong><div className="demo-miso-actions"><span><Heart size={13}/> Pet</span><span><Sparkles size={13}/> Play</span><span><Clock3 size={13}/> Nap</span></div></div>}
      </div>
    </div>
    <div className="showcase-bottom"><span>DESIGNED TO FEEL ALIVE</span><span>LOCAL FIRST · YOUR DATA STAYS YOURS</span></div>
  </section>;
}
