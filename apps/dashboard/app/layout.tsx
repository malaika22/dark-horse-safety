import type { Metadata } from "next";
import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dark Horse Force | Admin",
  description: "Dark Horse Safety admin platform",
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png" }],
    shortcut: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-dvh antialiased">
      <body className="h-dvh bg-background font-sans text-foreground">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
