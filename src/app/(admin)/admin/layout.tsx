import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Ghar Ko Swad Admin" },
  robots: { index: false, follow: false },
};

/**
 * A second root layout, separate from the storefront. The admin is a staff
 * tool: English only, never locale-prefixed, and never indexed.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-cream font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
