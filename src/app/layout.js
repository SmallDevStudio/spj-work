import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";

import { APP_METADATA } from "@/config/app.config";
import AppProviders from "@/providers/AppProviders";

import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  display: "swap",
});

export const metadata = APP_METADATA;

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} min-h-screen bg-slate-50 font-sans text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
