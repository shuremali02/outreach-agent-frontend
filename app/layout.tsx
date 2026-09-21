import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// One clear UI font for the whole app (headings, body, numbers). Replaces the
// Playfair Display serif headings + JetBrains Mono numbers + Plus Jakarta body:
// the team lead found the mix hard to read ("font change kerdo", 2026-09-19).
// Inter is built for on-screen reading at small sizes and has tabular figures
// for aligned phone numbers/amounts.
const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "elipse / studio — CRM",
  description: "3D configurator prospecting, enrichment and cold-call battlecards.",
  // The Elipse mark, in the colour that shows on the browser's own tab bar: black on a light browser
  // theme, white on a dark one (this follows the browser/OS theme, not the app's theme toggle).
  icons: {
    icon: [
      { url: "/favicon-on-light.png", type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-on-dark.png", type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

/**
 * Applied before paint so a stored light theme doesn't flash dark first.
 * Mirrors st.session_state["theme"], which defaults to "dark".
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem("elipse-theme");
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
