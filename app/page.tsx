import {
  ArrowRight,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { spotifyConfigured } from "@/lib/auth";
import { getSession } from "@/lib/session";

const STEPS = [
  {
    title: "Set the basics",
    body: "Title, description, public or private, collaborative — same switches Spotify gives you.",
  },
  {
    title: "Describe the music",
    body: "Type like you talk: “rainy late-night synthwave, 80s only, instrumental, nothing cheesy.”",
  },
  {
    title: "Anchor it with picks",
    body: "Add a few tracks you already want. The engine treats them as the center of gravity.",
  },
  {
    title: "Approve and publish",
    body: "Get 50 tracks, drop what you do not like, then create the playlist on your account.",
  },
];

const FEATURES = [
  {
    icon: Wand2,
    title: "Understands intent, not just keywords",
    body: "Genres, moods, decades, languages, activities and vetoes (“no rock”, “clean only”) are parsed into a search plan.",
  },
  {
    icon: ShieldCheck,
    title: "Your vetoes are enforced",
    body: "Negated genres are filtered against artist genre tags, not only titles, so a stray metal track cannot slip in.",
  },
  {
    icon: Users,
    title: "Built-in artist diversity",
    body: "Two tracks per artist by default, relaxed only when the pool is genuinely thin. No playlist with the same five names.",
  },
  {
    icon: ListChecks,
    title: "Nothing publishes without you",
    body: "Every generated track is reviewable and removable before anything is written to your Spotify account.",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="size-8 rounded-lg" />
          <span className="text-sm font-semibold tracking-tight">Crate</span>
        </div>
        <span className="hidden text-xs text-muted sm:block">
          Spotify playlists, described in your own words
        </span>
      </header>

      <main className="flex-1">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="eyebrow">Describe · Generate · Publish</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Say what you want to hear.
              <span className="block text-accent">Get 50 tracks.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              Sign in with Spotify, describe a vibe, and drop in a few songs you already
              love. Crate turns that into a full playlist — then lets you edit it before
              it lands in your library.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <SignInButton />
              </div>
              <a
                href="#how"
                className="btn-ghost w-full sm:w-auto"
              >
                How it works
                <ArrowRight className="size-4" />
              </a>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                Spotify sign-in did not complete. Check that the redirect URI matches
                exactly and that your account is allowlisted on the Spotify app.
              </p>
            ) : null}
          </div>

          <div className="card relative overflow-hidden p-5">
            <div className="absolute inset-x-0 -top-24 h-40 bg-accent/10 blur-3xl" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              The brief
            </p>
            <p className="mt-2 text-sm leading-relaxed text-fg/90">
              “Rainy late-night synthwave for a long drive, 80s only, instrumental,
              nothing cheesy.”
            </p>

            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-muted">
              What Crate hears
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "synthwave",
                "night drive",
                "1980s",
                "instrumental",
                "low energy",
                "clean",
              ].map((chip) => (
                <span key={chip} className="chip-accent">
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-bg/50 text-center">
              {[
                ["50", "tracks"],
                ["2×", "per artist"],
                ["1", "click to publish"],
              ].map(([value, label]) => (
                <div key={label} className="px-2 py-3">
                  <p className="font-mono text-lg text-accent">{value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!spotifyConfigured ? (
          <section className="card mb-12 border-warn/30 bg-warn/[0.04] p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-warn" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-warn">
                  Spotify credentials are not configured yet
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Sign-in is wired, but it needs your own Spotify app. Full steps are in{" "}
                  <span className="font-mono text-fg/80">README.md</span>; the short
                  version:
                </p>
                <ol className="mt-3 space-y-1 text-xs text-fg/80">
                  <li>
                    1. Create an app at{" "}
                    <span className="font-mono text-accent-soft">
                      developer.spotify.com/dashboard
                    </span>
                  </li>
                  <li>
                    2. Add redirect URI{" "}
                    <span className="font-mono text-accent-soft">
                      http://127.0.0.1:3000/api/auth/callback/spotify
                    </span>
                  </li>
                  <li>
                    3. Put the Client ID and Secret in{" "}
                    <span className="font-mono text-accent-soft">.env</span>, then
                    restart the dev server
                  </li>
                  <li>
                    4. Add your Spotify account under the app&apos;s User Management
                    (development mode caps it at 25 users)
                  </li>
                </ol>
              </div>
            </div>
          </section>
        ) : null}

        <section id="how" className="py-6">
          <h2 className="text-2xl font-semibold tracking-tight">Four steps, one playlist</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="card p-4">
                <p className="font-mono text-xs text-accent">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Not a random 50-song shuffle
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card flex gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <feature.icon className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-border py-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built on the Spotify Web API with Better Auth. Uses Spotify search, not the
          retired recommendations endpoint.
        </p>
        <p>Crate is not affiliated with Spotify.</p>
      </footer>
    </div>
  );
}
