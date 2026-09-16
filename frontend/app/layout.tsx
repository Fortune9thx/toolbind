import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Frame } from "@/components/Frame";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ToolBind",
  description: "Bind a tool at a commit. Seal it before the agent can call it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <Frame>{children}</Frame>
      </body>
    </html>
  );
}
