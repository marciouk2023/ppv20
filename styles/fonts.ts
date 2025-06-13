import { Inter, Roboto_Mono, Lato } from "next/font/google" // Importe Lato

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
})

export const lato = Lato({
  // Defina a fonte Lato
  weight: ["400", "700"], // Especifique os pesos que você usará
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lato",
})

// Example of how to define a local font if needed
// import localFont from 'next/font/local'
// export const myLocalFont = localFont({
//   src: '../public/fonts/my-local-font.woff2',
//   variable: '--font-my-local-font',
// })
