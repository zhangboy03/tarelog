import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const ogImage = `${protocol}://${host}/og.png`;
  return {
    title: { default: "Tarelog", template: "%s · Tarelog" },
    description: "A private food journal for recording real meals and seeing long-term patterns.",
    applicationName: "Tarelog",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Tarelog" },
    formatDetection: { telephone: false },
    other: { referrer: "no-referrer" },
    openGraph: { title: "Tarelog", description: "Know what you eat. Live a little better.", type: "website", images: [{ url: ogImage, width: 1200, height: 630, alt: "Tarelog — know what you eat, live a little better" }] },
    twitter: { card: "summary_large_image", title: "Tarelog", description: "Know what you eat. Live a little better.", images: [ogImage] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1f4f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
