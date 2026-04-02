import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Robbit Akademiyasi | Robototexnika va Dasturlash (6-15 yosh)",
  description:
    "6-15 yosh bolalar uchun robototexnika va dasturlash kurslari. Bepul sinov darsiga yoziling, eng yaqin filial va narxni bilib oling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={plusJakartaSans.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
