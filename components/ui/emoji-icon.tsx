import * as React from "react";
import {
  ArrowRight,
  Ban,
  Bot,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarDays,
  Car,
  Cpu,
  ChartColumn,
  Check,
  CircleCheck,
  CircleHelp,
  Circle,
  CircleX,
  Clipboard,
  Clock,
  Construction,
  Download,
  Earth,
  FileText,
  Flag,
  Flame,
  Folder,
  Globe,
  Handshake,
  Hourglass,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  LandPlot,
  LockOpen,
  Mail,
  Map as MapIcon,
  MessageSquare,
  Moon,
  NotebookPen,
  PartyPopper,
  Pencil,
  Phone,
  PhoneOff,
  Plus,
  RefreshCw,
  Repeat,
  Rocket,
  Sailboat,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Siren,
  Smartphone,
  Sofa,
  Sparkles,
  Star,
  Tag,
  Target,
  Timer,
  Trash2,
  Trophy,
  TriangleAlert,
  User,
  UserRound,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Emoji -> lucide icon (user, 2026-09-25: the emojis read as childish; use proper icons).
 *
 * The emoji stays in the DATA and in every string (category names and problem priorities are stored /
 * matched by their exact text, "⛳ Custom Golf Carts", "🔴 High Priority" -- never strip those at the
 * source). It is only swapped for an icon at render time: <Ico e="📞" /> for one, <IconText> for a
 * string / mixed children. Native <option> text cannot hold an SVG -- use stripEmoji() there.
 * An emoji that is not in this table is left as-is.
 */
const ICONS: Record<string, LucideIcon> = {};

// One place to read/edit the mapping. Variation selectors (U+FE0F) are stripped before lookup.
const TABLE: Array<[string[], LucideIcon]> = [
  [["🎯"], Target],
  [["✉️", "📧", "✉"], Mail],
  [["✅"], CircleCheck],
  [["✓"], Check],
  [["👤"], User],
  [["🧑‍💼"], UserRound],
  [["👥"], Users],
  [["📞"], Phone],
  [["📵"], PhoneOff],
  [["📱"], Smartphone],
  [["🌐"], Globe],
  [["🌍"], Earth],
  [["➕"], Plus],
  [["📅"], Calendar],
  [["🗓️", "🗓"], CalendarDays],
  [["⚡"], Zap],
  [["📄"], FileText],
  [["📝"], NotebookPen],
  [["✏️", "✏", "✍️", "✍"], Pencil],
  [["🏳️", "🏳", "⛳"], Flag],
  [["🔗"], Link2],
  [["💼"], Briefcase],
  [["🎉"], PartyPopper],
  [["🕒", "🕘"], Clock],
  [["🤖"], Bot],
  [["🌙"], Moon],
  [["💾"], Save],
  [["🔁"], Repeat],
  [["🔄"], RefreshCw],
  [["💬"], MessageSquare],
  [["📊"], ChartColumn],
  [["🚀"], Rocket],
  [["🏢"], Building2],
  [["🔍", "🔎"], Search],
  [["✨"], Sparkles],
  [["✕", "✖"], X],
  [["⏳"], Hourglass],
  [["⏱️", "⏱"], Timer],
  [["📥"], Download],
  [["📤"], Send],
  [["🗑️", "🗑"], Trash2],
  [["📋"], Clipboard],
  [["⚙️", "⚙"], Settings],
  [["🚨"], Siren],
  [["📁"], Folder],
  [["🛡️", "🛡"], ShieldCheck],
  [["🚫"], Ban],
  [["🔓"], LockOpen],
  [["🖼️", "🖼"], ImageIcon],
  [["🏷️", "🏷"], Tag],
  [["➡️", "➡"], ArrowRight],
  [["🤝"], Handshake],
  [["❌"], CircleX],
  [["⭐"], Star],
  [["🏆"], Trophy],
  [["⚠️", "⚠"], TriangleAlert],
  [["🔥"], Flame],
  [["🗺️", "🗺"], MapIcon],
  [["❔"], CircleHelp],
  [["⊞"], LayoutGrid],
  [["🏎️", "🏎"], Car],
  [["🛋️", "🛋"], Sofa],
  [["🏗️", "🏗"], Construction],
  [["⛵"], Sailboat],
];

// Colour per icon (user, 2026-09-25: "color full kr k use nhi kr skty?"). Theme tokens, so light/dark both work.
// Icons with no tone inherit the surrounding text colour (close buttons, copy buttons, ...). Inside a
// filled accent / white-text control, or a coloured pill, the tone is dropped again -- see .ico in globals.css.
type Tone = "success" | "warn" | "danger" | "info" | "accent";
const TONE_KEYS: Record<Tone, string[]> = {
  success: ["✅", "✓", "📞", "📱", "🎉", "🤝", "🛡️"],
  info: ["✉️", "📧", "👤", "👥", "🧑‍💼", "🏢", "🌐", "🌍", "🔗", "🔍", "🔎", "📥", "📤", "📊", "🗺️", "🤖", "🌙", "💬"],
  accent: ["🎯", "📅", "🗓️", "🕒", "🕘", "💼", "📁", "🚀", "📝", "✏️", "✍️", "📄", "💾", "⚙️", "🏷️", "🔄", "🔁", "➕", "⏱️", "⊞", "🖼️"],
  warn: ["⚡", "⭐", "✨", "🏆", "🔥", "⏳", "⚠️", "🔓"],
  danger: ["❌", "🚫", "🗑️", "🚨", "📵"],
};
const TONE: Record<string, Tone> = {};
for (const [tone, keys] of Object.entries(TONE_KEYS) as [Tone, string[]][]) {
  for (const k of keys) TONE[k.replace(/\uFE0F/g, "")] = tone;
}

// Status dots become a filled circle in the matching theme colour instead of a coloured emoji.
const DOTS: Record<string, string> = {
  "🟢": "var(--success)",
  "🟡": "var(--warn)",
  "🔴": "var(--danger)",
  "⚪": "var(--muted)",
};

for (const [keys, icon] of TABLE) for (const k of keys) ICONS[k.replace(/️/g, "")] = icon;

const KEYS = [...Object.keys(ICONS), ...Object.keys(DOTS)].sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const EMOJI_RE = new RegExp(`(${KEYS.map(escape).join("|")})\\uFE0F?`, "gu");
// Any emoji at all -- for stripEmoji() on text that must stay plain (<option>, window titles).
const ANY_EMOJI_RE = /(?:\p{Extended_Pictographic}|[✓✕✖⊞])(?:️|‍\p{Extended_Pictographic})*\s?/gu;

const ICON_CLASS = "inline-block h-[1.1em] w-[1.1em] shrink-0 align-[-0.2em]";

/** One emoji as an icon. Unknown emoji render as the emoji itself. */
export function Ico({ e, className }: { e: string; className?: string }) {
  const key = e.replace(/️/g, "");
  const dot = DOTS[key];
  if (dot) {
    return (
      <Circle
        aria-hidden
        className={cn("inline-block h-[0.7em] w-[0.7em] shrink-0 align-[-0.05em]", className)}
        style={{ color: dot }}
        fill="currentColor"
        strokeWidth={0}
      />
    );
  }
  const Icon = ICONS[key];
  if (!Icon) return <>{e}</>;
  const tone = TONE[key];
  return (
    <Icon
      aria-hidden
      className={cn(ICON_CLASS, tone && "ico", className)}
      style={tone ? { color: `var(--${tone})` } : undefined}
      strokeWidth={2}
    />
  );
}

function convert(text: string, keyPrefix: string): React.ReactNode {
  if (!text) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(EMOJI_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<Ico key={`${keyPrefix}-${n++}`} e={m[1]} />);
    last = at + m[0].length;
  }
  if (out.length === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Children with every known emoji in a text node swapped for its icon; elements pass through untouched. */
export function withIcons(children: React.ReactNode, keyPrefix = "e"): React.ReactNode {
  if (typeof children === "string") return convert(children, keyPrefix);
  // Children.map (not Array.map): it gives every child a key, so the elements that were static JSX siblings
  // don't trigger React's "each child in a list should have a unique key" error once they sit in an array.
  if (Array.isArray(children)) {
    return React.Children.map(children, (c, i) =>
      typeof c === "string" ? <React.Fragment>{convert(c, `${keyPrefix}${i}`)}</React.Fragment> : c,
    );
  }
  return children;
}

export function IconText({ children }: { children?: React.ReactNode }) {
  return <>{withIcons(children)}</>;
}

/** Plain text with the emoji removed ("⛳ Custom Golf Carts" -> "Custom Golf Carts") for <option> / titles. */
export function stripEmoji(text: string): string {
  return text.replace(ANY_EMOJI_RE, "").trim();
}

/**
 * A lead category with its own icon (user, 2026-09-25: golf / real estate / yacht ... have proper icons in
 * lucide, don't fall back to a generic emoji mapping). Matched on the words in the stored name, never
 * changing it; a category that matches nothing (a custom one) just gets its emoji converted as usual.
 * Native <option> cannot hold an SVG: use stripEmoji() there.
 */
const CATEGORY_ICONS: Array<[RegExp, LucideIcon, string]> = [
  [/golf/i, LandPlot, "var(--success)"],
  [/automotive|mobility|car\b/i, Car, "var(--danger)"],
  [/furniture|interior/i, Sofa, "var(--warn)"],
  [/real estate|megaproject/i, Building, "var(--info)"],
  [/yacht|marine|boat/i, Sailboat, "var(--accent)"],
  [/tech|commercial|product/i, Cpu, "var(--info)"],
];

export function CategoryLabel({ value }: { value: string }) {
  const hit = CATEGORY_ICONS.find(([re]) => re.test(value));
  if (!hit) return <>{withIcons(value)}</>;
  const [, Icon, color] = hit;
  return (
    <>
      <Icon aria-hidden className={cn(ICON_CLASS, "ico")} style={{ color }} strokeWidth={2} /> {stripEmoji(value)}
    </>
  );
}
