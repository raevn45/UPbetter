import { useEffect } from "react";

/**
 * UP's shared motion field.
 * Scroll velocity is measured in px/ms, filtered with an exponential Lerp,
 * then exposed as --u-curl-strength for DOM and WebGL consumers.
 *
 * Interactive targets use an overdamped spring:
 *   m*x'' + c*x' + k*(x-target) = 0
 * with m=1, k=520, c=50 (c² > 4mk), so the response settles without bounce.
 */
export default function EditorialRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.querySelector(".app-shell")?.getAttribute("data-reduced-motion") === "true";

    let previousY = window.scrollY;
    let previousTime = performance.now();
    let velocity = 0;
    let targetVelocity = 0;
    let scrollFrame = 0;
    let revealObserver: IntersectionObserver | null = null;
    const springs = new Map<HTMLElement, { x: number; v: number; target: number; frame: number; last: number }>();
    let pressedSpring: HTMLElement | null = null;

    const setRevealDelay = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      const parent = element.parentElement;
      const cascading = parent?.hasAttribute("data-cascade");
      const index = cascading && parent ? Array.prototype.indexOf.call(parent.children, element) : 0;
      element.style.setProperty("--cascade-delay", Math.min(Math.max(index, 0), 8) * 42 + "ms");
    };

    const observeReveal = (element: Element) => {
      if (!(element instanceof HTMLElement) || !element.matches("[data-reveal]") || element.classList.contains("is-visible")) return;
      setRevealDelay(element);
      if (reducedMotion() || !revealObserver) element.classList.add("is-visible");
      else revealObserver.observe(element);
    };

    const markSpringTargets = (node: ParentNode) => {
      const selector = [
        ".studio-link", ".primary-btn", ".outline-btn", ".quick-tile", ".toggle",
        ".preset", ".icon-btn", ".sound-play", ".favourite-btn", ".mobile-nav button",
        ".studio-more-menu button", ".mobile-more-menu button", ".alarm-row",
        ".sound-card", ".city-card", ".countdown-card", ".next-card", ".today-side-panel"
      ].join(",");
      if (node instanceof Element && node.matches(selector)) node.setAttribute("data-spring", "");
      node.querySelectorAll?.(selector).forEach(element => element.setAttribute("data-spring", ""));
    };

    const reveal = (node: ParentNode) => {
      if (node instanceof Element) observeReveal(node);
      node.querySelectorAll?.("[data-reveal]").forEach(observeReveal);
      markSpringTargets(node);
    };

    if ("IntersectionObserver" in window && !reducedMotion()) {
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
        if (node instanceof HTMLElement) reveal(node);
      }));
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const onPointer = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", (event.clientX / Math.max(1, window.innerWidth) * 100).toFixed(2) + "%");
      root.style.setProperty("--pointer-y", (event.clientY / Math.max(1, window.innerHeight) * 100).toFixed(2) + "%");
      if (reducedMotion() || event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tilt]") : null;
      document.querySelectorAll<HTMLElement>("[data-tilt][data-tilting]").forEach(element => {
        if (element !== target) {
          element.style.setProperty("--tilt-x", "0deg");
          element.style.setProperty("--tilt-y", "0deg");
          element.removeAttribute("data-tilting");
        }
      });
      if (target) {
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const y = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        target.style.setProperty("--tilt-x", (-y * 2.8).toFixed(2) + "deg");
        target.style.setProperty("--tilt-y", (x * 3.2).toFixed(2) + "deg");
        target.setAttribute("data-tilting", "true");
      }
    };

    const clearTilt = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-tilt][data-tilting]");
      if (target && (!event.relatedTarget || !(event.relatedTarget instanceof Node) || !target.contains(event.relatedTarget))) {
        target.style.setProperty("--tilt-x", "0deg");
        target.style.setProperty("--tilt-y", "0deg");
        target.removeAttribute("data-tilting");
      }
    };

    const springTo = (element: HTMLElement, target: number) => {
      if (reducedMotion()) {
        element.style.setProperty("--spring-scale", "1");
        return;
      }
      let state = springs.get(element);
      if (!state) {
        state = { x: 1, v: 0, target: 1, frame: 0, last: performance.now() };
        springs.set(element, state);
      }
      state.target = target;
      if (state.frame) return;
      state.last = performance.now();
      const step = (time: number) => {
        const dt = Math.min(0.032, Math.max(0.001, (time - state!.last) / 1000));
        state!.last = time;
        const mass = 1;
        const stiffness = 520;
        const damping = 50; // overdamped: 50² > 4 * 1 * 520
        const acceleration = (-damping * state!.v - stiffness * (state!.x - state!.target)) / mass;
        state!.v += acceleration * dt;
        state!.x += state!.v * dt;
        element.style.setProperty("--spring-scale", state!.x.toFixed(4));
        if (Math.abs(state!.x - state!.target) < 0.0008 && Math.abs(state!.v) < 0.008) {
          state!.x = state!.target;
          state!.v = 0;
          element.style.setProperty("--spring-scale", state!.target.toFixed(4));
          state!.frame = 0;
          if (state!.target === 1) springs.delete(element);
          return;
        }
        state!.frame = requestAnimationFrame(step);
      };
      state.frame = requestAnimationFrame(step);
    };

    const springTarget = (event: Event) =>
      event.target instanceof Element ? event.target.closest<HTMLElement>("[data-spring]") : null;
    const onPress = (event: PointerEvent) => {
      const target = springTarget(event);
      if (target && event.button === 0) {
        pressedSpring = target;
        springTo(target, 0.982);
      }
    };
    const onRelease = (event: PointerEvent) => {
      const target = pressedSpring || springTarget(event);
      if (target) springTo(target, 1);
      pressedSpring = null;
    };
    const onWindowBlur = () => {
      if (pressedSpring) springTo(pressedSpring, 1);
      pressedSpring = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      const target = springTarget(event);
      if (target && !target.hasAttribute("data-key-spring")) {
        target.setAttribute("data-key-spring", "");
        springTo(target, 0.982);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const target = springTarget(event);
      if (target) {
        target.removeAttribute("data-key-spring");
        springTo(target, 1);
      }
    };

    const tickScroll = (time: number) => {
      const dt = Math.min(48, Math.max(1, time - previousTime));
      previousTime = time;
      const alpha = 1 - Math.exp(-dt / 72);
      velocity += (targetVelocity - velocity) * alpha;
      targetVelocity *= Math.exp(-dt / 105);
      const curl = Math.max(-1, Math.min(1, velocity / 2.4));
      const compression = Math.min(Math.abs(curl) * 0.014, 0.014);
      root.style.setProperty("--scroll-velocity", velocity.toFixed(4));
      root.style.setProperty("--u-curl-strength", curl.toFixed(4));
      root.style.setProperty("--scroll-compress", compression.toFixed(4));
      root.style.setProperty("--scroll-skew", (curl * 1.35).toFixed(3) + "deg");
      if (Math.abs(velocity) > 0.002 || Math.abs(targetVelocity) > 0.002) {
        scrollFrame = requestAnimationFrame(tickScroll);
      } else {
        velocity = 0;
        targetVelocity = 0;
        root.style.setProperty("--scroll-velocity", "0");
        root.style.setProperty("--u-curl-strength", "0");
        root.style.setProperty("--scroll-compress", "0");
        root.style.setProperty("--scroll-skew", "0deg");
        scrollFrame = 0;
      }
    };

    const onScroll = () => {
      if (reducedMotion()) return;
      const now = performance.now();
      const y = window.scrollY;
      const elapsed = Math.max(1, now - previousTime);
      targetVelocity = Math.max(-2.4, Math.min(2.4, (y - previousY) / elapsed));
      previousY = y;
      if (!scrollFrame) scrollFrame = requestAnimationFrame(tickScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerout", clearTilt, { passive: true });
    document.addEventListener("pointerdown", onPress, { passive: true });
    document.addEventListener("pointerup", onRelease, { passive: true });
    document.addEventListener("pointercancel", onRelease, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerout", clearTilt);
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("pointerup", onRelease);
      document.removeEventListener("pointercancel", onRelease);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      springs.forEach((state, element) => {
        if (state.frame) cancelAnimationFrame(state.frame);
        element.style.setProperty("--spring-scale", "1");
      });
      springs.clear();
      mutations.disconnect();
      revealObserver?.disconnect();
      root.style.setProperty("--scroll-velocity", "0");
      root.style.setProperty("--u-curl-strength", "0");
      root.style.setProperty("--scroll-compress", "0");
      root.style.setProperty("--scroll-skew", "0deg");
    };
  }, []);

  return null;
}
