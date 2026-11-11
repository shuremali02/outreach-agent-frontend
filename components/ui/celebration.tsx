"use client";

import { useEffect, useState } from "react";
import { withIcons } from "@/components/ui/emoji-icon";

// The app's own existing semantic palette (same set Card/MetricCard/LeadCard's `accent` prop already
// draws from) -- no new color invented for this.
const COLORS = ["var(--success)", "var(--info)", "var(--warn)", "var(--accent)"];
// Bigger/further/more of them (user, 2026-10-14: "yeh kuch zyada he chota ho gaya hai, minor sa ho gaya
// ah" -- the first pass read as too subtle to register as an actual celebration; then "sparkles thory
// zyada kr do" bumped it further, 30 -> 46).
const COUNT = 90;
// Sparkles finish at ~1.5s; the message card appears right after and stays this long (user, 2026-11-11:
// "sparkles end hon us k baad card aye, 2-3 second tak rahe, phir jaye").
const CARD_DELAY_MS = 1400;
const CARD_HOLD_MS = 2800;

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
  message = "🏆 ALHAMDULILLAH! Deal Closed.",
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
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    // setState wrapped in a zero-delay setTimeout -- same react-hooks/set-state-in-effect fix pattern
    // already used elsewhere (cold-call-view.tsx's sortAt), rather than calling setParticles directly in
    // the effect body.
    const genId = setTimeout(() => {
      setParticles(
        Array.from({ length: COUNT }, (_, i) => {
          const angle = ((360 / COUNT) * i + (Math.random() * 20 - 10)) * (Math.PI / 180);
          // Reach the screen edges (user, 2026-11-11: "puri screen bhar do"), not just ~290px around centre.
          const reach = Math.max(window.innerWidth, window.innerHeight) * 0.6;
          const distance = reach * (0.25 + Math.random() * 0.75);
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
    const cardId = setTimeout(() => setShowCard(true), CARD_DELAY_MS);
    const doneId = setTimeout(() => onDone?.(), CARD_DELAY_MS + CARD_HOLD_MS);
    return () => {
      clearTimeout(genId);
      clearTimeout(cardId);
      clearTimeout(doneId);
    };
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden" aria-hidden>
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
      </div>
      {showCard && (
        <div className="celebration-card mx-4 max-w-[90vw] rounded-[16px] border border-success bg-card px-8 py-7 text-center shadow-[var(--shadow-overlay)] sm:px-12 sm:py-9">
          <p className="text-[1.5rem] font-bold leading-snug text-text sm:text-[2rem]">{withIcons(message)}</p>
        </div>
      )}
    </div>
  );
}
