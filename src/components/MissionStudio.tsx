import { useState } from "react";
import { Brain, Calculator, CheckCircle2, ClipboardList, Code2, Dices, Footprints, Lightbulb, RefreshCw, Sparkles, X } from "lucide-react";
import { upCore } from "../core";
import type { MissionConfig, MissionKind } from "../core/domain/types";
import type { WakeChallenge } from "../core/services/mission-service";

const choices: { kind: MissionKind; title: string; subtitle: string; detail: string; icon: typeof Brain }[] = [
  { kind: "math", title: "Quick maths", subtitle: "A tiny brain warm-up", detail: "Solve one short addition or subtraction question.", icon: Calculator },
  { kind: "memory", title: "Memory", subtitle: "Hold a pattern in mind", detail: "Remember a short number sequence and enter it.", icon: Brain },
  { kind: "sequence", title: "Sequence", subtitle: "Spot what comes next", detail: "Find the pattern and complete the number run.", icon: RefreshCw },
  { kind: "logic", title: "Logic", subtitle: "A little reasoning", detail: "Work out the next step in a simple pattern.", icon: Lightbulb },
  { kind: "typing", title: "Typing", subtitle: "Put the words in", detail: "Type a short phrase to finish the check.", icon: Code2 },
  { kind: "checklist", title: "Morning reset", subtitle: "A few gentle steps", detail: "Complete a small, flexible get-ready checklist.", icon: ClipboardList },
  { kind: "movement", title: "Gentle movement", subtitle: "Move if it suits you", detail: "A comfortable movement prompt, with no forced exercise.", icon: Footprints },
  { kind: "random", title: "Surprise me", subtitle: "Keep it unpredictable", detail: "A quick surprise check. You can always snooze instead.", icon: Dices }
];

export default function MissionStudio({ value, onChange, onComplete }: { value: MissionConfig | null; onChange: (next: MissionConfig | null) => void; onComplete?: () => void }) {
  const [preview, setPreview] = useState<WakeChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [phase, setPhase] = useState<"notice" | "question" | "build" | "repeat">("notice");
  const selected = choices.find(item => item.kind === value?.kind);

  const makePreview = () => {
    if (!value) return;
    setPreview(upCore.missions.create(value));
    setAnswer("");
    setFeedback("");
    setPhase("notice");
  };
  const repeatPreview = () => {
    if (!value) return;
    setPreview(upCore.missions.create(value));
    setAnswer("");
    setFeedback("");
    setPhase("question");
  };
  const check = () => {
    if (!preview) return;
    const action = preview.kind === "movement" || preview.kind === "checklist";
    const result = action ? upCore.missions.completeAction(preview.id).completed : upCore.missions.check(preview.id, answer).correct;
    setFeedback(result ? "Completed. This is how the wake-up check will feel." : "Not quite yet. Try again or make a fresh example.");
    if (result) { setPhase("build"); onComplete?.(); }
  };

  return <section className="mission-studio">
    <div className="mission-studio-head"><div><span className="eyebrow">WAKE-UP CHALLENGE</span><h3>Give your brain a gentle nudge.</h3><p>Pick the kind of check you want. Preview a real example before saving.</p></div><span className="mission-count">{value ? "01 SELECTED" : "OPTIONAL"}</span></div>
    <div className="mission-choice-grid">
      {choices.map(choice => { const Icon = choice.icon; const active = value?.kind === choice.kind; return <button type="button" key={choice.kind} className={`mission-choice ${active ? "is-selected" : ""}`} data-tilt onClick={() => { onChange(active ? null : { kind: choice.kind, difficulty: value?.difficulty ?? "easy", rounds: value?.rounds ?? 1 }); setPreview(null); }}>
        <span className="mission-choice-icon"><Icon size={18}/></span><span className="mission-choice-copy"><strong>{choice.title}</strong><small>{choice.subtitle}</small></span><span className="mission-choice-check">{active ? <CheckCircle2 size={17}/> : "+"}</span>
      </button>; })}
    </div>
    {value && <div className="mission-config">
      <div className="mission-selected-copy"><span className="eyebrow">YOUR SELECTION</span><strong>{selected?.title}</strong><p>{selected?.detail}</p></div>
      <div className="mission-config-controls"><label>Difficulty<select value={value.difficulty} onChange={e => onChange({ ...value, difficulty: e.target.value as MissionConfig["difficulty"] })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label>Rounds<select value={value.rounds} onChange={e => onChange({ ...value, rounds: Number(e.target.value) })}><option value={1}>1 round</option><option value={3}>3 rounds</option><option value={5}>5 rounds</option></select></label></div>
      <button type="button" className="mission-preview-button" onClick={makePreview}><Sparkles size={16}/> Open interactive preview <span>↗</span></button>
    </div>}
    {!value && <p className="mission-none">No challenge selected. Your alarm will ring normally, with snooze and stop controls.</p>}
    {preview && <div className="mission-preview-overlay" role="dialog" aria-modal="true" aria-label="Wake-up challenge preview">
      <div className="mission-preview-window">
        <div className="mission-preview-top"><span className="eyebrow">UP / MISSION SIMULATOR</span><button type="button" className="mission-close" onClick={() => setPreview(null)} aria-label="Close preview"><X size={18}/></button></div>
        <div className="mission-sequence" aria-label="Preview sequence">
          {(["notice", "question", "build", "repeat"] as const).map((step, index) => <span key={step} className={phase === step ? "active" : (["notice", "question", "build", "repeat"].indexOf(phase) > index ? "complete" : "")}>{String(index + 1).padStart(2, "0")} / {step.toUpperCase()}</span>)}
        </div>
        {phase === "notice" && <div className="mission-phase-card">
          <span className="mission-preview-label">01 / NOTICE</span>
          <div className="mission-preview-orbit"><div className="mission-preview-orbit-inner"><Sparkles size={26}/></div></div>
          <h3>A small check. A clearer start.</h3>
          <p>This is a preview of the wake-up challenge. Your real alarm will generate a fresh one. You can always snooze or stop the alarm.</p>
          <button type="button" className="mission-preview-submit" onClick={() => setPhase("question")}>Show me the challenge <span>↗</span></button>
        </div>}
        {phase === "question" && <div className="mission-phase-card">
          <div className="mission-preview-orbit"><div className="mission-preview-orbit-inner"><Sparkles size={26}/></div></div>
          <span className="mission-preview-label">{choices.find(c => c.kind === preview.kind)?.title ?? "Wake-up check"} · {preview.difficulty}</span>
          <h3>{preview.prompt}</h3>
          <p>{preview.hint}</p>
          {preview.kind === "movement" || preview.kind === "checklist" ? <button type="button" className="mission-preview-submit" onClick={check}>I'm ready</button> : <form onSubmit={e => { e.preventDefault(); check(); }}><input autoFocus value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Enter your answer" aria-label="Your answer"/><button type="submit" className="mission-preview-submit">Check answer</button></form>}
          {feedback && <div className="mission-preview-feedback">{feedback}</div>}
        </div>}
        {phase === "build" && <div className="mission-phase-card mission-phase-success">
          <span className="mission-preview-label">03 / BUILD</span>
          <div className="mission-build-mark"><CheckCircle2 size={34}/></div>
          <h3>That's one small win.</h3>
          <p>The point isn't a perfect morning. It's a repeatable first step. This is the feeling the challenge is designed to create.</p>
          <button type="button" className="mission-preview-submit" onClick={() => setPhase("repeat")}>Keep the rhythm going <span>↗</span></button>
        </div>}
        {phase === "repeat" && <div className="mission-phase-card">
          <span className="mission-preview-label">04 / REPEAT</span>
          <div className="mission-preview-orbit"><div className="mission-preview-orbit-inner"><RefreshCw size={25}/></div></div>
          <h3>Make it a pattern.</h3>
          <p>Try another example, or close the preview and save this mission to your alarm.</p>
          <button type="button" className="mission-preview-submit" onClick={repeatPreview}>Run another example <RefreshCw size={14}/></button>
        </div>}
        <div className="mission-preview-footer"><span>Preview only · your alarm gets a fresh challenge</span><button type="button" onClick={makePreview}>Restart sequence <RefreshCw size={14}/></button></div>
      </div>
    </div>}
  </section>;
}
