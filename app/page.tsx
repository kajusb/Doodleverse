import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Doodleverse</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Sign in to save your 3D worlds</h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            Sign in to upload sketches, generate worlds, and access your saved library.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="/auth/login?screen_hint=signup&returnTo=/upload"
            className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Sign up
          </a>
          <a
            href="/auth/login?returnTo=/upload"
            className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white transition hover:border-slate-400 hover:bg-slate-800"
          >
            Log in
          </a>
        </div>

        <p className="text-sm text-slate-400">
          You will only be sent to Auth0 when you explicitly choose to sign in.
        </p>

        <Link
          href="/upload"
          className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-slate-200"
        >
          Continue without signing in
        </Link>
      </div>
    </main>
  );
}