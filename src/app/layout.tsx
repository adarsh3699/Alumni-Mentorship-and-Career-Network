import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alma · Alumni Mentorship Network",
  description: "A trusted alumni mentorship and career network demo for Project 11.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
