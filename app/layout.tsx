import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProvider from "./components/AppProvider";
import Navbar from "./components/Navbar";
import RegisterSW from "./components/RegisterSW";
export const metadata: Metadata = {
  title: "Cellio · Stocks du foyer",
  description: "Vos caves, placards et réserves, simplement.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Cellio", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  themeColor: "#6b1931",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppProvider>
          <RegisterSW />
          <Navbar />
          <main>{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
