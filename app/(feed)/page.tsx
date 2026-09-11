import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { FeedList } from "@/components/works/FeedList";
import { getOwnerProfile } from "@/lib/data/profile";
import { getPublishedWorksPage } from "@/lib/data/works";

export default async function Home() {
  const [profile, feedPage] = await Promise.all([getOwnerProfile(), getPublishedWorksPage()]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Ambient Aurora glow, static here — becomes a slow drift animation in Phase 5 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--aurora)" }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <span
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          You<span className="bg-[image:var(--aurora)] bg-clip-text text-transparent">Link</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pb-24 sm:px-10">
        {profile ? (
          <ProfileHeader profile={profile} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No owner profile yet — run <code>npm run db:seed</code>.
          </p>
        )}

        <FeedList initialWorks={feedPage.works} initialCursor={feedPage.nextCursor} />

        <div className="flex w-full justify-center">
          <GuestUpgradeCard />
        </div>
      </main>
    </div>
  );
}
