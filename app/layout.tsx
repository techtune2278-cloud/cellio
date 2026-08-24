import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import RegisterSW from "./components/RegisterSW";
import InstallPrompt from "./components/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CELLIO - Ma Cave",
  description: "Ma gestion de caves à vin et réserves",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CELLIO",
  },
};

export const viewport: Viewport = {
  themeColor: "#831843", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <RegisterSW />
        <Navbar />
        <main className="max-w-4xl mx-auto p-2 sm:p-4">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}