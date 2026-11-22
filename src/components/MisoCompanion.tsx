import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Heart, Sparkles, Gift, Move, Palette } from "lucide-react";

type PixelCatEngine = {
  destroy(): void; setName(name: string): void; setButterfly(on: boolean, soon?: boolean): void;
  greet(message?: string): void; gift(): void; climb(direction: number): void; type(): void;
  setCoat(index: number): void; nextCoat(): void;
};
type PixelCatApi = { init(canvas: HTMLCanvasElement, options?: {
  name?: string; coatIndex?: number; cycleCoatOnClick?: boolean; butterfly?: boolean;
  reducedMotion?: boolean; onMeow?: () => void; onHearts?: (x: number, y: number) => void;
  onBehavior?: (label: string) => void; onPurrStart?: () => void; onPurrStop?: () => void;
}): PixelCatEngine };
declare global { interface Window { PixelCatLive?: PixelCatApi } }

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-up-pet="${src}"]`);
  if (existing?.dataset.loaded === "true") { resolve(); return; }
  const script = existing ?? document.createElement("script");
  script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, { once: true });
  script.addEventListener("error", () => reject(new Error("Miso's animation engine could not load.")), { once: true });
  if (!existing) { script.src = src; script.async = false; script.dataset.upPet = src; document.head.append(script); }
});

type Point = { x: number; y: number };
const readPoint = (): Point | null => {
  try { const raw = localStorage.getItem("up.miso.position"); return raw ? JSON.parse(raw) as Point : null; }
  catch { return null; }
};

export default function MisoCompanion({ name, reducedMotion = false, spotlight = false, cue = "welcome" }: { name: string; reducedMotion?: boolean; spotlight?: boolean; cue?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelCatEngine | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState<Point>({ x: Math.max(12, window.innerWidth - 148), y: Math.max(72, window.innerHeight - 168) });
  const [ready, setReady] = useState(false);
  const [behavior, setBehavior] = useState("keeping you company");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const saved = readPoint();
    if (saved) setPosition({ x: Math.max(0, Math.min(window.innerWidth - 126, saved.x)), y: Math.max(8, Math.min(window.innerHeight - 136, saved.y)) });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await loadScript("/miso/cat-sprite.js");
      await loadScript("/miso/cat-live.js");
      if (cancelled || !canvasRef.current || !window.PixelCatLive) return;
      const engine = window.PixelCatLive.init(canvasRef.current, {
        name, coatIndex: 0, cycleCoatOnClick: false, butterfly: true, reducedMotion,
        onMeow: () => { setBehavior("says hello"); },
        onHearts: () => setBehavior("very pleased with you"),
        onBehavior: label => setBehavior(label || "keeping you company"),
        onPurrStart: () => setBehavior("purring"),
        onPurrStop: () => setBehavior("keeping you company")
      });
      engineRef.current = engine;
      engine.setName(name);
      engine.setButterfly(true, true);
      setReady(true);
    };
    void boot().catch(error => console.error(error));
    return () => { cancelled = true; engineRef.current?.destroy(); engineRef.current = null; };
  }, []);

  useEffect(() => { engineRef.current?.setName(name); }, [name]);
  useEffect(() => { if (!cue || cue === "welcome") return; if (cue === "alarm-created") { engineRef.current?.gift(); setBehavior("a new plan!"); } else if (cue.startsWith("mission-complete")) { engineRef.current?.greet("you did it ♥"); setBehavior("proud of that little win"); } else engineRef.current?.greet("you got this ♥"); }, [cue]);
  useEffect(() => {
    const resize = () => setPosition(p => ({ x: Math.max(0, Math.min(window.innerWidth - (spotlight ? 190 : 126), p.x)), y: Math.max(8, Math.min(window.innerHeight - (spotlight ? 190 : 136), p.y)) }));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [spotlight]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const width = spotlight ? 190 : 126, height = spotlight ? 190 : 136;
    const next = { x: Math.max(0, Math.min(window.innerWidth - width, drag.left + event.clientX - drag.x)), y: Math.max(0, Math.min(window.innerHeight - height, drag.top + event.clientY - drag.y)) };
    setPosition(next);
    try { localStorage.setItem("up.miso.position", JSON.stringify(next)); } catch { /* position remains live for this session */ }
  };
  const finishDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null; setDragging(false);
  };

  return <div className={`miso-companion ${spotlight ? "miso-companion--spotlight" : ""} ${dragging ? "is-dragging" : ""}`}
    style={{ left: position.x, top: position.y }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag}
    aria-label={`${name}, your movable pixel cat companion`}>
    <div className="miso-speech" aria-live="polite">{behavior}</div>
    <canvas ref={canvasRef} className="miso-companion-canvas" aria-label={`${name}, animated pixel cat. Drag to move and tap to pet.`} />
    <div className="miso-float-tools">
      <button type="button" title="Pet Miso" onClick={() => { engineRef.current?.greet("hello ♥"); setBehavior("happy to see you"); }}><Heart size={13}/></button>
      <button type="button" title="Give Miso a treat" onClick={() => { engineRef.current?.gift(); setBehavior("thank you for the treat!"); }}><Gift size={13}/></button>
      <button type="button" title="Toggle butterfly" onClick={() => { engineRef.current?.setButterfly(true, true); setBehavior("butterfly patrol"); }}><Sparkles size={13}/></button>
      <button type="button" title="Change Miso’s coat" onClick={() => { engineRef.current?.nextCoat(); setBehavior("new look, same Miso"); }}><Palette size={13}/></button>
      <button type="button" title="Move Miso to the lower corner" onClick={() => { const next = { x: Math.max(8, window.innerWidth - 142), y: Math.max(8, window.innerHeight - 152) }; setPosition(next); try { localStorage.setItem("up.miso.position", JSON.stringify(next)); } catch { /* optional persistence */ } }}><Move size={13}/></button>
    </div>
    {!ready && <span className="miso-loading">MISO IS WAKING UP</span>}
  </div>;
}
