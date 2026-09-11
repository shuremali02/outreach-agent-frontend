/**
 * eyebrow + .hero-heading + .subtitle — the top of a view.
 *
 * `eyebrow` is optional because app.py renders no `date-eyebrow` on Pipeline,
 * Follow-up Hub or AI Lead Finder. Passing one there adds a line the Streamlit
 * app never showed.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header>
      {eyebrow && <p className="date-eyebrow">{eyebrow}</p>}
      <h1 className="hero-heading">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
