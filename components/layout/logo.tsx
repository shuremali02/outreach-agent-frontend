/* eslint-disable @next/next/no-img-element -- fixed-size brand mark, both variants are tiny static files */

/**
 * The Elipse mark. Two files, one per theme: black on the light theme, white on the dark theme.
 * Which one shows is decided by CSS from <html data-theme> (see .logo-mark in globals.css), which the
 * inline script in app/layout.tsx sets before first paint, so there is no flash of the wrong one.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <>
      <img src="/elipse-mark-on-light.png" alt="" width={size} height={size} className="logo-mark logo-mark--light" />
      <img src="/elipse-mark-on-dark.png" alt="" width={size} height={size} className="logo-mark logo-mark--dark" />
    </>
  );
}

/** The mark + wordmark from the Streamlit sidebar. "/ studio" removed (user, 2026-09-23). */
export function Logo() {
  return (
    <div className="logo-container">
      <LogoMark />
      <span className="logo-text">elipse</span>
    </div>
  );
}
