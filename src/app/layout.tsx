import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/latin-300.css";
import "@fontsource/cormorant-garamond/latin-300-italic.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import "./site.css";
import "./villa.css";
import "./shop.css";
import { ParallaxObserver, RevealObserver } from "@/components/site/Reveal";
import { ShopHydrator } from "@/components/site/ShopHydrator";

export const metadata: Metadata = {
  metadataBase: new URL("https://gdhomefabric.in"),
  title: {
    default: "GD Home Fabric — Made-to-Measure Curtains & Goose Feather Pillows",
    template: "%s · GD Home Fabric",
  },
  description:
    "Made-to-measure velvet, blackout, linen, sheer and embroidered curtains, and goose feather pillows. Walk through eight rooms of our villa in 3D and dress every window before you order.",
  openGraph: {
    type: "website",
    siteName: "GD Home Fabric",
    url: "https://gdhomefabric.in",
    title: "GD Home Fabric — curtains and pillows, made to measure",
    description: "Walk through the villa, open the curtains, change the fabric — then have it made for your own windows.",
    images: [{ url: "/renders/og.jpg", width: 1200, height: 630, alt: "A sunlit living room dressed in GD Home Fabric curtains" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1d3a34",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* scroll-reveal hides content only when scripts run */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <ShopHydrator />
        <RevealObserver />
        <ParallaxObserver />
        {children}
      </body>
    </html>
  );
}
