import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "WealthOvers — Advanced Personal Money Manager",
  description:
    "A privacy-first personal finance platform for multi-account banking, precision budgeting, investment tracking, and Android transaction synchronization.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/logo-dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

