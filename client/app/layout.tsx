import { Metadata } from "next";
import "./globals.css";
import roboto from "@/fonts/fontRoBoto";
import env from "@/utils/environment";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: env.APP_NAME,
  description: env.DESCRIPTION,
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-icon.png",
    shortcut: "/favicon/favicon.ico",
  },
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
      </head>
      <body className={`${roboto.className} antialiased`} suppressHydrationWarning={true}>
        <main>{children}</main>
        <Toaster/>
      </body>
    </html>
  );
}