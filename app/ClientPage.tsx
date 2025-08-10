"use client"

import type React from "react"

import { inter, robotoMono, lato } from "@/styles/fonts"
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Main from "@/components/layout/Main";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

export default function ClientPage() {
  return (
    <div className={`min-h-screen flex flex-col ${inter.variable} ${robotoMono.variable} ${lato.variable} font-sans`}>
      {/* Header */}
      <Header/>

      {/*Main*/}
      <Main/>

      {/* Footer */}
      <Footer/>

      <WhatsAppButton/>
      {/* Schema.org markup para Igreja */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Church",
            name: "Igreja Evangélica Novo Dia Porto",
            alternateName: "Igreja Evangélica no Porto",
            url: "https://www.igrejanovodia.pt",
            logo: "https://www.igrejanovodia.pt/images/igreja_evangelica_no_porto.jpg",
            description: "Igreja Evangélica no Porto - IND (Igreja Novo Dia) é uma comunidade cristã acolhedora no centro do Porto.",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Rua da Alegria, 847",
              addressLocality: "Porto",
              postalCode: "4000-314",
              addressCountry: "PT",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: "41.15866403622216",
              longitude: "-8.601594829782256",
            },
            telephone: "+447897274321",
            openingHours: ["Su 10:00-12:00", "Fr 20:30-22:00"],
            sameAs: ["https://www.instagram.com/novodiapt/"],
          }),
        }}
      />
      <style jsx global>{`
        .text-shadow-lg {
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
