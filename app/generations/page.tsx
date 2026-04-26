import { SavedGenerations } from "@/components/SavedGenerations";

export default function GenerationsPage() {
  return (
    <>
      <header className="topbar">
        <a href="/upload" className="topbar-wordmark">Doodleverse</a>
        <nav className="topbar-nav">
          <a href="/upload" className="topbar-nav-btn">Create</a>
          <a href="/generations" className="topbar-nav-btn active">Gallery</a>
          <a href="/sample" className="topbar-nav-btn">Sample</a>
        </nav>
        <div className="topbar-actions" />
      </header>

      <div className="page-shell">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 80px" }}>
          {/* Page header */}
          <div className="anim-fade-up" style={{ marginBottom: 40 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--ink-light)",
                marginBottom: 10,
              }}
            >
              Your library
            </p>
            <h1
              style={{
                fontFamily: "var(--font-caveat), cursive",
                fontSize: 42,
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              Saved worlds
            </h1>
            <p style={{ color: "var(--ink-mid)", fontSize: 15, maxWidth: 520, lineHeight: 1.65 }}>
              Each generation is scoped to your account — only you can see your saved worlds.
            </p>
          </div>

          <div className="anim-fade-up anim-d2">
            <SavedGenerations />
          </div>
        </div>
      </div>
    </>
  );
}