import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "พินิจ ปิดร้าน — Daily Close-Out",
  description: "ระบบปิดร้านประจำวัน",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <main className="min-h-screen max-w-md mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
