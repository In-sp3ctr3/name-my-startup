import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Caveat, Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { env, hasClerkConfig } from "@/env";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const namelift = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-namelift",
  weight: ["500", "600", "700", "800"]
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
  weight: ["600", "700"]
});

export const metadata: Metadata = {
  title: "Namelift | Name my startup",
  description: "Turn a rough startup idea into a shortlist of launch-ready names with availability and risk signals.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const content = hasClerkConfig ? (
    <ClerkProvider
      publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      {children}
    </ClerkProvider>
  ) : (
    children
  );
  return (
    <html lang="en" className={`${sans.variable} ${namelift.variable} ${caveat.variable}`}>
      <body>{content}</body>
    </html>
  );
}
