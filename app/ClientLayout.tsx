"use client"

import type React from "react"
import { Urbanist } from "next/font/google"
import "@/lib/ensure-shadcn-deps" // make sure peer-deps are resolved
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"

/* ────────────────────────────────  Google Font  ────────────────────────────── */
const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

/* ─────────────────────────────  Root Layout  ──────────────────────────────── */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={urbanist.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
