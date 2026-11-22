import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Heart, Sparkles, Gift, Palette } from "lucide-react";

type PixelCatEngine = {
  destroy(): void; setName(name: string): void; setButterfly(on: boolean, soon?: boolean): void;
  greet(message?: string): void; gift(): void; climb(direction: number): void; type(): void; walk(duration?: number): void;
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
const readCoat = (): number => { try { const value = Number(localStorage.getItem("up.miso.coat")); return Number.isInteger(value) && value >= 0 ? value : 0; } catch { return 0; } };
const readPoint = (): Point | null => {
  try { const raw = localStorage.getItem("up.miso.position"); return raw ? JSON.parse(raw) as Point : null; }
  catch { return null; }
};

export default function MisoCompanion({ name, reducedMotion = false, spotlight = false, cue = "welcome" }: { name: string; reducedMotion?: boolean; spotlight?: boolean; cue?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelCatEngine | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState<Point>({ x: Math.max(12, window.innerWidth - 124), y: Math.max(72, window.innerHeight - 134) });
  const [ready, setReady] = useState(false);
  const [behavior, setBehavior] = useState("keeping you company");
  const [dragging, setDragging] = useState(false);
  const [walking, setWalking] = useState(false);
  const [butterflyOn, setButterflyOn] = useState(true);
  const [coatIndex, setCoatIndex] = useState(readCoat);

  useEffect(() => {
    const saved = readPoint();
    if (saved) setPosition({ x: Math.max(0, Math.min(window.innerWidth - 112, saved.x)), y: Math.max(8, Math.min(window.innerHeight - 122, saved.y)) });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await loadScript("/miso/cat-sprite.js");
      await loadScript("/miso/cat-live.js");
      if (cancelled || !canvasRef.current || !window.PixelCatLive) return;
      const engine = window.PixelCatLive.init(canvasRef.current, {
        name, coatIndex, cycleCoatOnClick: false, butterfly: true, reducedMotion,
        onMeow: () => { setBehavior("says hello"); },
        onHearts: () => setBehavior("very pleased with you"),
        onBehavior: label => setBehavior(label || "keeping you company"),
        onPurrStart: () => setBehavior("purring"),
        onPurrStop: () => setBehavior("keeping you company")
      });
      engineRef.current = engine;
      engine.setName(name);
      engine.setCoat(coatIndex);
      engine.setButterfly(true, true);
      setReady(true);
    };
    void boot().catch(error => console.error(error));
    return () => { cancelled = true; engineRef.current?.destroy(); engineRef.current = null; };
  }, []);

  useEffect(() => { engineRef.current?.setName(name); }, [name]);
  useEffect(() => { if (!cue || cue === "welcome") return; if (cue.startsWith("alarm-created")) { engineRef.current?.gift(); setBehavior("a new plan!"); } else if (cue.startsWith("mission-complete")) { engineRef.current?.greet("you did it ♥"); setBehavior("proud of that little win"); } else engineRef.current?.greet("you got this ♥"); }, [cue]);
  useEffect(() => {
    const resize = () => setPosition(p => ({ x: Math.max(0, Math.min(window.innerWidth - (spotlight ? 150 : 112), p.x)), y: Math.max(8, Math.min(window.innerHeight - (spotlight ? 150 : 122), p.y)) }));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [spotlight]);

  useEffect(() => {
    if (reducedMotion) return;
    const roam = () => {
      if (dragRef.current || document.hidden) return;
      const width = spotlight ? 190 : 126;
      const height = spotlight ? 190 : 136;
      const next = {
        x: Math.max(8, Math.round(Math.random() * Math.max(8, window.innerWidth - width - 8))),
        y: Math.max(8, Math.round(Math.random() * Math.max(8, window.innerHeight - height - 8)))
      };
      setWalking(true);
      engineRef.current?.walk(3600);
      setPosition(next);
      try { localStorage.setItem("up.miso.position", JSON.stringify(next)); } catch { /* session-only movement */ }
      window.setTimeout(() => setWalking(false), 3700);
    };
    const id = window.setInterval(roam, 14000);
    return () => window.clearInterval(id);
  }, [reducedMotion, spotlight]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const width = spotlight ? 150 : 112, height = spotlight ? 150 : 122;
    const next = { x: Math.max(0, Math.min(window.innerWidth - width, drag.left + event.clientX - drag.x)), y: Math.max(0, Math.min(window.innerHeight - height, drag.top + event.clientY - drag.y)) };
    setPosition(next);
    try { localStorage.setItem("up.miso.position", JSON.stringify(next)); } catch { /* position remains live for this session */ }
  };
  const finishDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null; setDragging(false);
  };

  return <div className={`miso-companion ${spotlight ? "miso-companion--spotlight" : ""} ${dragging ? "is-dragging" : ""} ${walking ? "is-walking" : ""}`}
    style={{ left: position.x, top: position.y }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag}
    aria-label={`${name}, your roaming pixel cat companion`}>
    <div className="miso-speech" aria-live="polite">{behavior}</div>
    <canvas ref={canvasRef} className="miso-companion-canvas" aria-label={`${name}, animated pixel cat. Drag to move and tap to pet.`} />
    <div className="miso-float-tools">
      <button type="button" title="Pet Miso" onClick={() => { engineRef.current?.greet("hello ♥"); setBehavior("happy to see you"); }}><Heart size={13}/></button>
      <button type="button" title="Give Miso a treat" onClick={() => { engineRef.current?.gift(); setBehavior("thank you for the treat!"); }}><Gift size={13}/></button>
      <button type="button" title={butterflyOn?"Hide butterfly":"Bring back butterfly"} onClick={() => { const next = !butterflyOn; setButterflyOn(next); engineRef.current?.setButterfly(next, true); setBehavior(next?"butterfly patrol":"quiet time"); }}><Sparkles size={13}/></button>
      <button type="button" title="Change Miso’s coat" onClick={() => { const next = (coatIndex + 1) % 14; setCoatIndex(next); engineRef.current?.setCoat(next); try { localStorage.setItem("up.miso.coat", String(next)); } catch { /* optional persistence */ } setBehavior("new look, same Miso"); }}><Palette size={13}/></button>
      
    </div>
    {!ready && <span className="miso-loading">MISO IS WAKING UP</span>}
  </div>;
}
