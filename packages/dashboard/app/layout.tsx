import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: "BlackBox",
  description: "System flight recorder",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
