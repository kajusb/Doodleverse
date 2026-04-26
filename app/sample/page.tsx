"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { sampleScene } from "@/lib/sampleScene";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Scene scene={sampleScene} />

      {/* Topbar overlay */}
      <header
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "var(--topbar)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "rgba(255,255,255,0.86)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <a
          href="/upload"
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Doodleverse
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <a href="/upload" className="topbar-nav-btn">Create</a>
          <a href="/generations" className="topbar-nav-btn">Gallery</a>
          <a href="/sample" className="topbar-nav-btn active">Sample</a>
        </nav>
        <div style={{ width: 120 }}>
          <button
            onClick={() => router.push("/upload")}
            className="btn btn-primary btn-sm"
          >
            ← Create yours
          </button>
        </div>
      </header>
    </div>
  );
}