import { Avatar } from "@/components/ui/avatar";
import { GlowBorder } from "@/components/motion/GlowBorder";
import { Reveal } from "@/components/motion/Reveal";
import type { OwnerProfile } from "@/lib/data/profile";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** `ProfileHeader` from DESIGN_SYSTEM.md §6's component inventory. */
export function ProfileHeader({ profile }: { profile: OwnerProfile }) {
  return (
    <Reveal className="w-full">
      <div className="relative w-full overflow-hidden rounded-[var(--radius-lg)]">
        <div
          aria-hidden
          className="h-32 w-full sm:h-40"
          style={{
            background: profile.coverUrl ? undefined : "var(--aurora-soft)",
            backgroundImage: profile.coverUrl ? `url(${profile.coverUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <GlowBorder className="relative -mt-10 flex flex-col gap-4 p-5 sm:-mt-12 sm:flex-row sm:items-end sm:p-6">
          <Avatar
            src={profile.avatarUrl}
            alt={profile.displayName}
            fallback={initials(profile.displayName)}
            size={88}
            ring
          />

          <div className="min-w-0 flex-1">
            <h1
              className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {profile.displayName}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="mt-2 max-w-prose text-sm" style={{ color: "var(--text-secondary)" }}>
                {profile.bio}
              </p>
            )}
            {profile.links.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {profile.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                      style={{ color: "var(--color-violet-500)" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-left sm:text-right">
            <p
              className="font-[family-name:var(--font-display)] text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {profile.followerCount}
            </p>
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              {profile.followerCount === 1 ? "Follower" : "Followers"}
            </p>
          </div>
        </GlowBorder>
      </div>
    </Reveal>
  );
}
