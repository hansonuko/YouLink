import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { ThemeProvider } from "@/components/theme-provider";
import { TurnstileGate } from "@/components/TurnstileGate";
import { getOwnerProfile } from "@/lib/data/profile";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "YouLink — Your work. Your link. Your network.",
    template: "%s · YouLink",
  },
  description:
    "A lite, motion-first personal social network for showcasing a portfolio — follow, like, share, and chat, no account required.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const owner = await getOwnerProfile();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <TurnstileGate />
        {/* Chatting with yourself is meaningless (same reasoning as
            FollowButton hiding on the owner's own profile view) — only
            mount the launcher for a visitor who isn't the owner, and only
            once there's actually an owner profile to chat with. */}
        {owner && !owner.isViewer && <ChatLauncher ownerDisplayName={owner.displayName} />}
      </body>
    </html>
  );
}
