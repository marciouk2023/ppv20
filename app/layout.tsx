import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./ClientLayout"
import "./globals.css" // globals.css should still be imported here

/* ────────────────────────────────  Metadata  ──────────────────────────────── */
export const metadata: Metadata = {
  title: "Parabéns pra você",
  description: "Connect and send WhatsApp messages",
  icons: {
    icon: "/favicon.svg",
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>
}
