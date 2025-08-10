import { Inter, Roboto_Mono, Lato, Montserrat, Poppins } from "next/font/google" // Importe Lato

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
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lato",
})

export const montserrat = Montserrat({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
})

export const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
})

// Example of how to define a local font if needed
// import localFont from 'next/font/local'
// export const myLocalFont = localFont({
//   src: '../public/fonts/my-local-font.woff2',
//   variable: '--font-my-local-font',
// })
