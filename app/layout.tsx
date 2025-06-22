import type React from "react"
import type { Metadata } from "next"
import { inter, robotoMono, lato } from "@/styles/fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Igreja Evangélica no Porto | IND - Igreja Evangélica Novo Dia Porto",
  description:
    "Igreja Evangélica no Porto? Conheça a IND - Igreja Evangélica Novo Dia - Porto. Situada no centro da cidade do Porto.",
  keywords:
    "igreja evangélica, igreja evangélica no porto, igreja novo dia, culto evangélico porto, igreja cristã porto",
  openGraph: {
    title: "Igreja Evangélica no Porto | IND - Igreja Evangélica Novo Dia Porto",
    description:
      "Conheça a Igreja Evangélica Novo Dia no centro do Porto. Cultos aos domingos às 10h e sextas às 20:30h.",
    url: "https://www.igrejanovodia.pt",
    siteName: "Igreja Evangélica Novo Dia Porto",
    images: [
      {
        url: "https://www.igrejanovodia.pt/images/igreja_evangelica_no_porto.jpg",
        width: 1200,
        height: 630,
        alt: "Igreja Evangélica no Porto - Novo Dia",
      },
    ],
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Igreja Evangélica no Porto | IND - Igreja Evangélica Novo Dia Porto",
    description:
      "Conheça a Igreja Evangélica Novo Dia no centro do Porto. Cultos aos domingos às 10h e sextas às 20:30h.",
    images: ["https://www.igrejanovodia.pt/images/igreja_evangelica_no_porto.jpg"],
  },
  alternates: {
    canonical: "https://www.igrejanovodia.pt",
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${inter.variable} ${robotoMono.variable} ${lato.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MLSJGKNW');`,
          }}
        />
        {/* End Google Tag Manager */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <meta name="theme-color" content="#3A1F5C" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MLSJGKNW"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  )
}
