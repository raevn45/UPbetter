import { useEffect } from "react";

/** Shared pointer and scroll signals plus viewport-aware editorial reveals. */
export default function EditorialRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let previousY = window.scrollY;
    let previousTime = performance.now();
    let velocity = 0;
    let targetVelocity = 0;
    let frame = 0;
    let revealObserver: IntersectionObserver | null = null;

    const reveal = (node: ParentNode) => {
      const elements = node.querySelectorAll?.("[data-reveal]:not(.is-visible)") ?? [];
      elements.forEach(element => {
        if (reduced || !revealObserver) element.classList.add("is-visible");
        else revealObserver.observe(element);
      });
    };

    if ("IntersectionObserver" in window && !reduced) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    }
    reveal(document);
    const mutations = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.matches("[data-reveal]") && !node.classList.contains("is-visible")) {
            if (reduced || !revealObserver) node.classList.add("is-visible");
            else revealObserver.observe(node);
          }
          reveal(node);
        }
      }));
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const onPointer = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${(event.clientX / Math.max(1, window.innerWidth) * 100).toFixed(2)}%`);
      root.style.setProperty("--pointer-y", `${(event.clientY / Math.max(1, window.innerHeight) * 100).toFixed(2)}%`);
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tilt]") : null;
      document.querySelectorAll<HTMLElement>("[data-tilt][data-tilting]").forEach(element => {
        if (element !== target) {
          element.style.setProperty("--tilt-x", "0deg");
          element.style.setProperty("--tilt-y", "0deg");
          element.removeAttribute("data-tilting");
        }
      });
      if (target && !reduced) {
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
        const y = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
        target.style.setProperty("--tilt-x", `${(-y * 2.4).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${(x * 2.8).toFixed(2)}deg`);
        target.setAttribute("data-tilting", "true");
      }
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.target instanceof Element) {
        const target = event.target.closest<HTMLElement>("[data-tilt][data-tilting]");
        if (target && (!event.relatedTarget || !(event.relatedTarget instanceof Node) || !target.contains(event.relatedTarget))) {
          target.style.setProperty("--tilt-x", "0deg");
          target.style.setProperty("--tilt-y", "0deg");
          target.removeAttribute("data-tilting");
        }
      }
    };
    const tick = () => {
      velocity += (targetVelocity - velocity) * .22;
      targetVelocity *= .82;
      const intensity = Math.min(Math.abs(velocity) * .014, .035);
      root.style.setProperty("--scroll-velocity", velocity.toFixed(3));
      root.style.setProperty("--scroll-direction", velocity < 0 ? "-1" : "1");
      root.style.setProperty("--scroll-compress", intensity.toFixed(4));
      root.style.setProperty("--scroll-skew", `${Math.min(Math.abs(velocity) * .22, 1.2).toFixed(3)}deg`);
      if (Math.abs(velocity) > .003 || Math.abs(targetVelocity) > .003) frame = requestAnimationFrame(tick);
      else {
        velocity = 0; targetVelocity = 0;
        root.style.setProperty("--scroll-velocity", "0");
        root.style.setProperty("--scroll-compress", "0");
        root.style.setProperty("--scroll-skew", "0deg");
        frame = 0;
      }
    };
    const onScroll = () => {
      if (reduced) return;
      const now = performance.now();
      const y = window.scrollY;
      targetVelocity = (y - previousY) / Math.max(1, now - previousTime);
      previousY = y; previousTime = now;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerout", onPointerOut);
      if (frame) cancelAnimationFrame(frame);
      mutations.disconnect();
      revealObserver?.disconnect();
      root.style.setProperty("--scroll-velocity", "0");
      root.style.setProperty("--scroll-compress", "0");
      root.style.setProperty("--scroll-skew", "0deg");
    };
  }, []);
  return null;
}
