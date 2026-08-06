import type { Metadata } from "next";
import { Syne, Limelight, Manrope, Noto_Sans_Mono } from "next/font/google";
import { ChatBot } from "@/components/ChatBot";
import { MissionControl } from "@/components/mission-control/MissionControl";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_ICONS,
  SITE_NAME,
  SITE_URL,
} from "@/data/seo";
import "./globals.css";

/** Display — bold geometric for impactful headings */
const display = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const deco = Limelight({
  subsets: ["latin"],
  variable: "--font-limelight",
  weight: "400",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const mono = Noto_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  keywords: [
    "Satyakabir Technologies",
    "AI engineering",
    "cloud engineering",
    "product engineering",
    "Bengaluru software company",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: SITE_ICONS,
  alternates: { canonical: "/" },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("sk-theme");var dark=t!=="light";var r=document.documentElement;r.classList.toggle("dark",dark);r.dataset.theme=dark?"dark":"light";}catch(e){document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${deco.variable} ${body.variable} ${mono.variable} font-sans`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <SiteJsonLd />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          {children}
          <MissionControl />
          <ScrollToTop />
          <ChatBot />
        </ThemeProvider>
      </body>
    </html>
  );
}
