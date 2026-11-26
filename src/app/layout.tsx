import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Merriweather } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/settings";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], weight: ["400", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings().catch(() => null);
  const name = s?.app_name || "Pigeon Press";
  return {
    title: { default: name, template: `%s · ${name}` },
    description:
      "A digital newsstand: discover, favourite and read magazines from independent publishers — right in the app.",
    applicationName: name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: name },
    icons: {
      icon: s?.app_icon_id ? `/api/images/${s.app_icon_id}` : "/icons/icon-192.png",
      apple: s?.app_icon_id ? `/api/images/${s.app_icon_id}` : "/icons/icon-180.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#274540",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSettings().catch(() => null);
  const fontVar =
    s?.font_family === "poppins"
      ? "var(--font-poppins)"
      : s?.font_family === "merriweather"
        ? "var(--font-merriweather)"
        : s?.font_family === "system"
          ? "ui-sans-serif, system-ui"
          : "var(--font-inter)";
  const bgImage = s?.background_image_id ? `url(/api/images/${s.background_image_id})` : "none";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={
        {
          "--app-font": fontVar,
          "--primary": s?.primary_color || "#274540",
          "--ring": s?.primary_color || "#274540",
          "--splash-bg": s?.splash_bg_color || "#274540",
          "--bg-image": bgImage,
          "--bg-size": s?.background_size || "cover",
          "--bg-pos": s?.background_position || "center",
          "--bg-opacity": s?.background_opacity || "0.10",
          "--bg-parallax": s?.background_parallax === "on" ? "fixed" : "scroll",
        } as React.CSSProperties
      }
      className={`${inter.variable} ${poppins.variable} ${merriweather.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
