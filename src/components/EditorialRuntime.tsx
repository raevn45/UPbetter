import { useEffect } from "react";

/** Keeps pointer/scroll signals outside React render state so DOM motion stays frame-synchronised. */
export default function EditorialRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    let previousY = window.scrollY;
    let previousTime = performance.now();
    let velocity = 0;
    let frame = 0;
    let targetVelocity = 0;
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const elapsed = Math.max(1, now - previousTime);
      targetVelocity = (y - previousY) / elapsed;
      previousY = y;
      previousTime = now;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const tick = () => {
      velocity += (targetVelocity - velocity) * 0.22;
      targetVelocity *= 0.82;
      root.style.setProperty("--scroll-velocity", velocity.toFixed(3));
      root.style.setProperty("--scroll-direction", velocity < 0 ? "-1" : "1");
      if (Math.abs(velocity) > 0.003 || Math.abs(targetVelocity) > 0.003) frame = requestAnimationFrame(tick);
      else { velocity = 0; targetVelocity = 0; root.style.setProperty("--scroll-velocity", "0"); frame = 0; }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); root.style.setProperty("--scroll-velocity", "0"); };
  }, []);
  return null;
}
