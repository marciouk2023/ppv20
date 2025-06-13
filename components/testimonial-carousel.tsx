"use client"

import Image from "next/image"
import { Star } from "lucide-react"

interface Testimonial {
  image: string
  name: string
  text: string
  title: string // Mantido, mas não usado diretamente no novo layout do item
  rating: number
  jobTitle: string // Novo campo para o cargo/profissão
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
}

export default function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  return (
    <section className="py-16 md:py-24 lg:py-32 px-4 bg-slate-700">
      <div className="max-w-7xl mx-auto text-center mb-12 space-y-4">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide text-white">
          Testemunhos
        </h2>
        <p className="text-lg md:text-xl font-sans leading-relaxed max-w-3xl mx-auto text-white">
          Vidas Transformadas pela Graça
        </p>
      </div>
      <div className="relative max-w-7xl mx-auto overflow-hidden">
        {/* Alterado para grid de 2 colunas em md e 4 em lg para alinhar 4 imagens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="mb-12 md:mb-0 text-center" // Adicionado text-center para alinhar o conteúdo
            >
              <div className="mb-6 flex justify-center">
                <Image
                  src={testimonial.image || "/placeholder.svg"}
                  alt={`Profile of ${testimonial.name}`}
                  width={128} // Equivalente a w-32 (128px)
                  height={128} // Equivalente a w-32 (128px)
                  className="rounded-full shadow-lg dark:shadow-black/30 object-cover"
                  loading="lazy" // Lazy load testimonial images
                />
              </div>
              <h5 className="mb-4 text-xl font-semibold text-white">{testimonial.name}</h5>
              <h6 className="mb-4 font-semibold text-white">{testimonial.jobTitle}</h6>
              <p className="mb-4 text-white">
                {/* O ícone de aspas foi removido para simplificar e usar apenas Lucide React */}
                {testimonial.text}
              </p>
              <ul className="mb-0 flex items-center justify-center">
                {[...Array(5)].map((_, i) => (
                  <li key={i}>
                    <Star
                      className={`h-5 w-5 ${
                        i < testimonial.rating ? "text-onda-yellow fill-onda-yellow" : "text-gray-300"
                      }`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
