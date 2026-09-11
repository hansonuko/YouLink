import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlowBorder } from "@/components/motion/GlowBorder";
import { Reveal } from "@/components/motion/Reveal";

const phases = [
  { label: "Scaffold", status: "done" },
  { label: "Identity & Data", status: "next" },
  { label: "Profile & Feed", status: "planned" },
  { label: "Social Actions", status: "planned" },
  { label: "Chat", status: "planned" },
  { label: "Motion Polish", status: "planned" },
  { label: "Launch", status: "planned" },
] as const;

export default function Home() {
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-24 text-center sm:px-10">
        <Reveal>
          <p
            className="font-mono text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Phase 0 · Scaffold
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <h1
            className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Your work.{" "}
            <span className="bg-[image:var(--aurora)] bg-clip-text text-transparent">
              Your link.
            </span>{" "}
            Your network.
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p
            className="max-w-xl text-balance text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            The themed shell is live — Aurora tokens, dark/light theming, and the motion
            primitives are wired up. Follow, like, share, and chat land in the phases below.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg">
              Follow
            </Button>
            <Button variant="secondary" size="lg">
              Chat
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.2} className="w-full max-w-2xl">
          <GlowBorder className="w-full p-5 sm:p-6">
            <ol className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              {phases.map((phase) => (
                <li key={phase.label} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background:
                        phase.status === "done"
                          ? "var(--color-teal-400)"
                          : phase.status === "next"
                            ? "var(--color-violet-500)"
                            : "var(--text-tertiary)",
                    }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        phase.status === "planned"
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {phase.label}
                  </span>
                </li>
              ))}
            </ol>
          </GlowBorder>
        </Reveal>
      </main>
    </div>
  );
}
