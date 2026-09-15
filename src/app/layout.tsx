import type { Metadata, Viewport } from "next";
import { DM_Mono, Newsreader } from "next/font/google";
import { LANG_SCRIPT } from "@/lib/lang";
import { SITE } from "@/lib/site";
import "./globals.css";

const serif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const mono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

// Restores the saved language and shortens the intro for returning visitors,
// before the first paint.
const HEAD_SCRIPT = `${LANG_SCRIPT}try{if(sessionStorage.getItem("astra:visited"))document.documentElement.dataset.intro="short";sessionStorage.setItem("astra:visited","1")}catch(e){}`;

const description = "The partner to companies building the next big thing with AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  description,
  openGraph: {
    title: SITE.name,
    description,
    url: "/",
    siteName: SITE.name,
    locale: "en_US",
    alternateLocale: ["pt_BR"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-lang="en"
      className={`${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
