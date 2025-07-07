import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Configuração do Firebase - Parabéns pra você",
  description: "Configure a coleção de usuários no Firebase Firestore",
}

export default function FirebaseSetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
