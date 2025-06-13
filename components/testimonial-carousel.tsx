"use client"

import Image from "next/image"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useSwipeable } from "react-swipeable"

interface Testimonial {
  image: string
  name: string
  text: string
  title: string
  rating: number
  jobTitle: string
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
}

export default function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint do Tailwind
    }

    // Verificar no carregamento inicial
    checkIfMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkIfMobile)

    // Limpar listener
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  // Funções para navegação do carrossel
  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)
  }

  // Configuração para swipe
  const handlers = useSwipeable({
    onSwipedLeft: () => nextTestimonial(),
    onSwipedRight: () => prevTestimonial(),
    trackMouse: true,
  })

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

      {/* Versão Desktop - Grid */}
      <div className="relative max-w-7xl mx-auto overflow-hidden">
        {/* Grid para desktop */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="mb-12 md:mb-0 text-center">
              <div className="mb-6 flex justify-center">
                <Image
                  src={testimonial.image || "/placeholder.svg"}
                  alt={`Profile of ${testimonial.name}`}
                  width={128}
                  height={128}
                  className="rounded-full shadow-lg dark:shadow-black/30 object-cover"
                  loading="lazy"
                />
              </div>
              <h5 className="mb-4 text-xl font-semibold text-white">{testimonial.name}</h5>
              <h6 className="mb-4 font-semibold text-white">{testimonial.jobTitle}</h6>
              <p className="mb-4 text-white">{testimonial.text}</p>
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

        {/* Carrossel para Mobile */}
        <div className="sm:hidden" {...handlers}>
          <div className="relative">
            {/* Carrossel com transição suave */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className="flex flex-col items-center">
                      <div className="mb-6 flex justify-center">
                        <Image
                          src={testimonial.image || "/placeholder.svg"}
                          alt={`Profile of ${testimonial.name}`}
                          width={128}
                          height={128}
                          className="rounded-full shadow-lg dark:shadow-black/30 object-cover"
                          loading="lazy"
                        />
                      </div>
                      <h5 className="mb-4 text-xl font-semibold text-white">{testimonial.name}</h5>
                      <h6 className="mb-4 font-semibold text-white">{testimonial.jobTitle}</h6>
                      <p className="mb-4 text-white">{testimonial.text}</p>
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
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de navegação */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full"
              aria-label="Testemunho anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full"
              aria-label="Próximo testemunho"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Indicadores de página */}
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentIndex === index ? "w-6 bg-onda-yellow" : "w-2 bg-gray-400"
                  }`}
                  aria-label={`Ir para o testemunho ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
