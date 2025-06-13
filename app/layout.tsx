import type React from "react"
import type { Metadata } from "next"
import { inter, robotoMono, lato } from "@/styles/fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Igreja Evangélica em Paris | IND - Igreja Evangélica Novo Dia Paris",
  description:
    "Igreja Evangélica em Paris? Conheça a IND - Igreja Evangélica Novo Dia - Paris. Situada em Montrouge, Paris.",
  keywords:
    "igreja evangélica, igreja evangélica em paris, igreja novo dia, culto evangélico paris, igreja cristã paris, igreja brasileira paris",
  openGraph: {
    title: "Igreja Evangélica em Paris | IND - Igreja Evangélica Novo Dia Paris",
    description: "Conheça a Igreja Evangélica Novo Dia em Montrouge, Paris. Cultos aos sábados às 15h.",
    url: "https://www.igrejaevangelicaemparis.com",
    siteName: "Igreja Evangélica Novo Dia Paris",
    images: [
      {
        url: "https://www.igrejanovodia.fr/images/igreja_evangelica_em_paris.jpg",
        width: 1200,
        height: 630,
        alt: "Igreja Evangélica em Paris - Novo Dia",
      },
    ],
    locale: "pt_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Igreja Evangélica em Paris | IND - Igreja Evangélica Novo Dia Paris",
    description: "Conheça a Igreja Evangélica Novo Dia em Montrouge, Paris. Cultos aos sábados às 15h.",
    images: ["https://www.igrejanovodia.fr/images/igreja_evangelica_em_paris.jpg"],
  },
  alternates: {
    canonical: "https://www.igrejanovodia.fr",
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-FR" className={`${inter.variable} ${robotoMono.variable} ${lato.variable}`}>
      <head>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <meta name="theme-color" content="#3A1F5C" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  )
}
