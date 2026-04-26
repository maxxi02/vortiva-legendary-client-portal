import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Plus_Jakarta_Sans, Merriweather } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "@/providers/QueryProvider";

const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-serif" });

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-headline",
  style: ["normal", "italic"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Vortiva Client Portal",
  description: "Vortiva ERP Client Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        newsreader.variable,
        plusJakartaSans.variable,
        geistMono.variable,
        "font-body",
        "font-serif",
        merriweather.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
