import { Toaster } from "@/components/ui/toaster";
import roboto from "@/fonts/fontRoBoto";
import { home } from "@/utils/metadata";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";

export const metadata: Metadata = {
  title: home.title,
  description: home.description,
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-icon.png",
    shortcut: "/favicon/favicon.ico",
  },
  openGraph:{
    ...home.openGraph,
  },
  keywords: home.keywords,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel='apple-touch-icon' sizes='180x180' href='/favicon/apple-touch-icon.png' />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <meta name="google-site-verification" content="STneKsRDm2QioYuvfDcauR_bdyT8tFlOwkyC3gYM3NI" />
      </head>
      <body className={`${roboto.className} antialiased`} suppressHydrationWarning={true}>
        <main className="overflow-auto">{children}</main>
        <Toaster/>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}