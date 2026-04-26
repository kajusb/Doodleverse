import type { Metadata, Viewport } from "next";
import { Caveat, Patrick_Hand, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ClickSpark from "@/components/ClickSpark";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DoodleVerse", template: "%s · DoodleVerse" },
  description: "Sketch a world, upload it, walk inside it — DoodleVerse turns doodles into explorable 3D scenes.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", caveat.variable, patrickHand.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-patrick-hand), cursive" }}>
        <ClickSpark sparkColor="#111" sparkSize={12} sparkRadius={22} sparkCount={8} duration={450}>
          {children}
        </ClickSpark>
      </body>
    </html>
  );
}
