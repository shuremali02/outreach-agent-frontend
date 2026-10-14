"use client";

import { useEffect, useState } from "react";
import { withIcons } from "@/components/ui/emoji-icon";

// The app's own existing semantic palette (same set Card/MetricCard/LeadCard's `accent` prop already
// draws from) -- no new color invented for this.
const COLORS = ["var(--success)", "var(--info)", "var(--warn)", "var(--accent)"];
// Bigger/further/more of them (user, 2026-10-14: "yeh kuch zyada he chota ho gaya hai, minor sa ho gaya
// ah" -- the first pass read as too subtle to register as an actual celebration; then "sparkles thory
// zyada kr do" bumped it further, 30 -> 46).
const COUNT = 46;

interface Particle {
  id: number;
  color: string;
  x: number;
  y: number;
  delay: number;
  size: number;
  shape: "circle" | "square";
  rot: number;
}

/**
 * "Client Closed" (user, 2026-10-14: "ese he hum Client Closed button press kryn toh press hoty he ek
 * chota sa celebration type kuch aye") -- a brief burst of small squares in the app's own palette, pure
 * CSS keyframes (see .celebration-particle in globals.css), same no-extra-dependency approach toast.tsx's
 * existing toast-in animation already uses. Mount conditionally right where the action happened
 * (`{show && <Celebration onDone={...} />}`); self-reports done after ~1.1s so the caller can unmount it.
 * Respects prefers-reduced-motion (globals.css hides the particles outright for that case).
 */
export function Celebration({
  onDone,
  message = "🏆 Congratulations! Deal Closed.",
}: {
  onDone?: () => void;
  /** User, 2026-10-14: "sath me congratulations ya kuch likha ajaye." Defaults to the "Client Closed"
   * case, which is the only caller today; pass a different one for a future use of this component. */
  message?: string;
}) {
  // Math.random() is impure, so it can't run during render (react-hooks/purity) -- generated once in an
  // effect right after mount instead of a useMemo factory. The one-tick-empty-then-populated flash is
  // invisible in practice for a burst that's only ever on screen for ~1.1s total.
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // setState wrapped in a zero-delay setTimeout -- same react-hooks/set-state-in-effect fix pattern
    // already used elsewhere (cold-call-view.tsx's sortAt), rather than calling setParticles directly in
    // the effect body.
    const genId = setTimeout(() => {
      setParticles(
        Array.from({ length: COUNT }, (_, i) => {
          const angle = ((360 / COUNT) * i + (Math.random() * 20 - 10)) * (Math.PI / 180);
          const distance = 130 + Math.random() * 160;
          return {
            id: i,
            color: COLORS[i % COLORS.length],
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            delay: Math.random() * 100,
            size: 8 + Math.random() * 9,
            // Mixed shapes + individual spin (user, 2026-10-14: "thora or acha krdo") -- real confetti
            // isn't uniform squares tumbling at the same fixed angle.
            shape: Math.random() > 0.5 ? "circle" : "square",
            rot: Math.random() * 540 - 270,
          };
        }),
      );
    }, 0);
    const doneId = setTimeout(() => onDone?.(), 1500);
    return () => {
      clearTimeout(genId);
      clearTimeout(doneId);
    };
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center" aria-hidden>
      <div className="relative h-0 w-0">
        <span className="celebration-flash absolute h-6 w-6 rounded-full" style={{ background: "var(--success)" }} />
        {particles.map((p) => (
          <span
            key={p.id}
            className={`celebration-particle absolute ${p.shape === "circle" ? "rounded-full" : "rounded-[2px]"}`}
            style={
              {
                width: p.size,
                height: p.size,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                "--cx": `${p.x}px`,
                "--cy": `${p.y}px`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          />
        ))}
        <p className="celebration-text absolute whitespace-nowrap text-[1.3rem] font-bold text-text">
          {withIcons(message)}
        </p>
      </div>
    </div>
  );
}
