import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const helveticaNeueBold = localFont({
  src: "../../public/fonts/HelveticaNeue-Bold.otf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-helvetica-bold",
});

export const metadata: Metadata = {
  title: "Анализ взаимодействия препаратов",
  description: "Приложение для анализа взаимодействия лекарственных препаратов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${helveticaNeueBold.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
