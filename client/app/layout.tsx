import type { Metadata } from "next";
import "./globals.css";
import roboto from "@/fonts/fontRoBoto";
import env from "@/utils/environment";
export const metadata: Metadata = {
  title: env.APP_NAME,
  description: env.DESCRIPTION,
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
