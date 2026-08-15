import type { Metadata, Viewport } from "next";
import { CacheBust } from "@/components/CacheBust";
import { ViewportLock, VIEWPORT_LOCK_SCRIPT } from "@/lib/ui/fit-viewport";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "WhisT — משחק קלפים מרובה משתתפים",
  description: "משחק WhisT (Mini-Bridge) ל-4 שחקנים — צור חדר, הצטרף עם קוד, או שחק כאורח.",
  applicationName: "WhisT",
  appleWebApp: {
    capable: true,
    title: "WhisT",
    statusBarStyle: "black-translucent",
  },
  other: {
    "cache-control": "no-store",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d2818",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <script dangerouslySetInnerHTML={{ __html: VIEWPORT_LOCK_SCRIPT }} />
      </head>
      <body className={`${heebo.variable} font-sans`}>
        <ViewportLock />
        <CacheBust />
        {children}
      </body>
    </html>
  );
}
