import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/latin-300.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import "./villa.css";
import "./shop.css";
import "./print.css";
import { ShopHydrator } from "@/components/site/ShopHydrator";

export const metadata: Metadata = {
  metadataBase: new URL("https://gdhomefabric.in"),
  title: {
    default: "GD Home Fabric — The Villa · Curtains & Goose Feather Pillows",
    template: "%s · GD Home Fabric",
  },
  description:
    "Step inside the GD Home Fabric villa. Explore eight rooms in 3D, open and close the curtains, and compose velvet, blackout, linen, sheer and embroidered curtains — or dress the bed in goose feather pillows.",
  openGraph: {
    type: "website",
    siteName: "GD Home Fabric",
    url: "https://gdhomefabric.in",
    title: "GD Home Fabric — The Villa",
    description: "A luxury interior showroom in 3D: curtains and goose feather pillows, dressed room by room.",
    images: [{ url: "/renders/og.jpg", width: 1200, height: 630, alt: "The GD Home Fabric villa, seen from above" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2a2015",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ShopHydrator />
        {children}
      </body>
    </html>
  );
}
