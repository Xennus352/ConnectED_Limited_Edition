/**
 * useGsapReveal
 *
 * One-shot GSAP entrance animation for page sections. Mark elements inside the
 * returned ref's subtree with:
 *
 *   data-gsap-stagger  → every direct child fades/slides in with a stagger
 *   data-gsap="fade-up"   → single element slides up
 *   data-gsap="fade"      → single element fades in
 *   data-gsap="scale-in"  → single element scales up gently
 *
 * `useLayoutEffect` applies the starting state before first paint, so there is
 * no flash of the un-animated layout. Respects `prefers-reduced-motion`.
 */
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

interface RevealOptions {
  /** Stagger gap between items of a `data-gsap-stagger` group (seconds). */
  stagger?: number;
  /** Vertical travel for fade-up groups (px). */
  y?: number;
  /** Base tween duration (seconds). */
  duration?: number;
}

export const useGsapReveal = <T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {}
): React.RefObject<T> => {
  const ref = useRef<T>(null);
  const { stagger = 0.07, y = 20, duration = 0.6 } = options;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Stagger groups: animate every direct child of [data-gsap-stagger].
      root.querySelectorAll<HTMLElement>("[data-gsap-stagger]").forEach((group) => {
        const targets = Array.from(group.children);
        if (targets.length === 0) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y },
          { opacity: 1, y: 0, duration, ease: "power3.out", stagger }
        );
      });

      // Standalone element animations.
      root
        .querySelectorAll<HTMLElement>("[data-gsap='fade-up']")
        .forEach((el, index) => {
          gsap.fromTo(el, { opacity: 0, y }, {
            opacity: 1,
            y: 0,
            duration,
            ease: "power3.out",
            delay: index * 0.05,
          });
        });
      root
        .querySelectorAll<HTMLElement>("[data-gsap='fade']")
        .forEach((el, index) => {
          gsap.fromTo(el, { opacity: 0 }, {
            opacity: 1,
            duration: Math.max(0.3, duration - 0.1),
            ease: "power2.out",
            delay: index * 0.05,
          });
        });
      root
        .querySelectorAll<HTMLElement>("[data-gsap='scale-in']")
        .forEach((el) => {
          gsap.fromTo(el, { opacity: 0, scale: 0.96 }, {
            opacity: 1,
            scale: 1,
            duration: Math.max(0.3, duration - 0.05),
            ease: "power3.out",
          });
        });
    }, root);

    return () => ctx.revert();
  }, [stagger, y, duration]);

  return ref;
};

export default useGsapReveal;