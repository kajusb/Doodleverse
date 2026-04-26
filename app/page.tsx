/* ── Landing page keyframes ── */
const LANDING_STYLES = `
  @keyframes fadeIn    { from { opacity: 0; }                          to { opacity: 1; } }
  @keyframes fadeUp    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes mgwRight  { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes mgwLeft   { from { opacity: 0; transform: translateY(36px) scaleX(-1); } to { opacity: 1; transform: translateY(0) scaleX(-1); } }
`;

/* ── Topbar ── */
function Topbar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: "92px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px",
        zIndex: 200,
        background: "rgba(255,255,255,0.88)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-caveat), cursive",
          fontSize: "42px",
          fontWeight: 700,
          color: "var(--ink)",
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        Doodle<span style={{ color: "var(--ink-mid)" }}>Verse</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <a
          href="/auth/login?returnTo=/upload"
          style={{
            fontFamily: "var(--font-patrick-hand), cursive",
            fontSize: "18px",
            padding: "11px 30px",
            borderRadius: "28px",
            border: "1.5px solid rgba(0,0,0,0.18)",
            background: "transparent",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          Log in
        </a>
        <a
          href="/auth/login?screen_hint=signup&returnTo=/upload"
          style={{
            fontFamily: "var(--font-patrick-hand), cursive",
            fontSize: "18px",
            padding: "11px 30px",
            borderRadius: "28px",
            border: "none",
            background: "var(--ink)",
            color: "#fff",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}
        >
          Sign up
        </a>
      </div>
    </header>
  );
}

/* ── Animated ink-stroke title ── */
function AnimatedTitle() {
  return (
    <svg
      viewBox="0 0 820 116"
      width="700"
      style={{ maxWidth: "92vw", overflow: "visible", display: "block" }}
      aria-label="DoodleVerse"
      role="img"
    >
      <text
        className="ink-draw"
        x="50%"
        y="98"
        textAnchor="middle"
        fontSize="110"
        fontFamily="var(--font-caveat), Caveat, cursive"
        fontWeight="700"
        letterSpacing="-1"
      >
        DoodleVerse
      </text>
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <style>{LANDING_STYLES}</style>
      <Topbar />

      {/* ── Hero ── */}
      <main
        style={{
          paddingTop: "92px",
          minHeight: "100vh",
          paddingBottom: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-patrick-hand), cursive",
          color: "var(--ink)",
          gap: 0,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Title */}
        <div style={{ opacity: 0, animation: "fadeIn 0.1s 0.4s ease forwards" }}>
          <AnimatedTitle />
        </div>

        {/* Subtitle */}
        <p
          style={{
            marginTop: "10px",
            fontSize: "clamp(15px, 2vw, 19px)",
            color: "var(--ink-light)",
            letterSpacing: "0.2px",
            lineHeight: 1.7,
            opacity: 0,
            animation: "fadeUp 0.6s 2.9s ease forwards",
            textAlign: "center",
            maxWidth: "480px",
            padding: "0 16px",
          }}
        >
          Draw a top-down map. Upload a photo.<br />
          Walk inside your own 3D world.
        </p>

        {/* CTA row */}
        <div
          style={{
            marginTop: "36px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: 0,
            animation: "fadeUp 0.6s 3.2s ease forwards",
            position: "relative",
            zIndex: 20,
          }}
        >
          <a
            href="/auth/login?returnTo=/upload"
            style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "22px",
              fontWeight: 700,
              padding: "14px 42px",
              borderRadius: "28px",
              border: "none",
              background: "var(--ink)",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
              letterSpacing: "-0.2px",
            }}
          >
            Get started
          </a>
          <a
            href="/auth/login?screen_hint=signup&returnTo=/upload"
            style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "22px",
              fontWeight: 700,
              padding: "14px 42px",
              borderRadius: "28px",
              border: "2px solid rgba(0,0,0,0.18)",
              background: "rgba(255,255,255,0.82)",
              color: "var(--ink)",
              textDecoration: "none",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              letterSpacing: "-0.2px",
            }}
          >
            Sign up free
          </a>
        </div>


      </main>

      {/* ── Mr. Game & Watch — bottom-right (faces left, original) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mr-game-and-watch.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 0,
          right: "clamp(24px, 4vw, 72px)",
          width: "clamp(160px, 16vw, 240px)",
          height: "auto",
          opacity: 0,
          animation: "mgwRight 0.9s 3.5s cubic-bezier(0.22,1,0.36,1) forwards",
          pointerEvents: "none",
          zIndex: 50,
          filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.14))",
        }}
      />

      {/* ── Mr. Game & Watch — bottom-left (mirrored, faces right) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mr-game-and-watch.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 0,
          left: "clamp(24px, 4vw, 72px)",
          width: "clamp(160px, 16vw, 240px)",
          height: "auto",
          opacity: 0,
          animation: "mgwLeft 0.9s 3.7s cubic-bezier(0.22,1,0.36,1) forwards",
          pointerEvents: "none",
          zIndex: 50,
          filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.14))",
          transform: "scaleX(-1)",
        }}
      />

      {/* ── Footer ── */}
      <div
        style={{
          position: "fixed",
          bottom: "14px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: 0,
          animation: "fadeUp 0.5s 3.8s ease forwards",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: "13px",
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          DoodleVerse © {new Date().getFullYear()} · turn doodles into worlds
        </span>
      </div>
    </>
  );
}
