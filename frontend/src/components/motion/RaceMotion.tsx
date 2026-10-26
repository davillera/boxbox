"use client";

import { useEffect } from "react";
import { HOVERS, PRESETS, motionOK } from "@/lib/motion";

/**
 * One runtime for the whole site's micro-motion (anime.js). Components only tag
 * elements with `data-anim` / `data-hover`, so they can stay server components.
 *
 * - Blocks already on screen when the page hydrates are left alone (no flash).
 * - Blocks below the fold are posed off-screen and play when they scroll in.
 * - Blocks added later (a new prediction, streamed content) play right away if visible.
 */
export function RaceMotion() {
  useEffect(() => {
    if (!motionOK()) return;
    const seen = new WeakSet<Element>();
    const run = (el: HTMLElement) => {
      seen.add(el);
      PRESETS[el.dataset.anim ?? ""]?.play(el, Number(el.dataset.delay ?? 0));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          run(e.target as HTMLElement);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    };
    const tagged = (root: ParentNode) =>
      root.querySelectorAll<HTMLElement>("[data-anim]");

    // Hydration: only what is still off-screen gets posed and waits.
    for (const el of tagged(document)) {
      // Moves with no start pose (loops) can start in place without a jump.
      if (visible(el)) {
        if (PRESETS[el.dataset.anim ?? ""]?.hide) seen.add(el);
        else run(el);
      } else {
        PRESETS[el.dataset.anim ?? ""]?.hide?.(el);
        io.observe(el);
      }
    }

    // Later DOM (new results, Suspense streams): pose before paint, then play.
    const mo = new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const found = [
            ...(node.matches("[data-anim]") ? [node] : []),
            ...tagged(node),
          ];
          for (const el of found) {
            if (seen.has(el)) continue;
            PRESETS[el.dataset.anim ?? ""]?.hide?.(el);
            if (visible(el)) run(el);
            else io.observe(el);
          }
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("[data-hover]");
      if (!el || el.contains(e.relatedTarget as Node | null)) return;
      HOVERS[el.dataset.hover ?? ""]?.(el);
    };
    document.addEventListener("pointerover", onOver);

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("pointerover", onOver);
    };
  }, []);
  return null;
}
