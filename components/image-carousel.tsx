"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

interface ImageCarouselProps {
  images: { src: string; alt: string; width: number; height: number }[]
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)

  // Duplicate images to create a seamless loop
  const duplicatedImages = [...images, ...images]

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    // Calculate total width of all images for animation
    let totalWidth = 0
    const imageElements = carousel.querySelectorAll("img")
    imageElements.forEach((img) => {
      totalWidth += img.offsetWidth + 16 // Add margin-right (gap-4)
    })

    // Set CSS variable for animation
    carousel.style.setProperty("--carousel-width", `${totalWidth / 2}px`) // Half because of duplication
  }, [images])

  return (
    <div className="relative w-full overflow-hidden py-8 bg-onda-light-gray">
      {/* Texto adicionado acima do carrossel */}
      <div className="text-center mb-8">
        <h2 className="text-black text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide">
          ESTAMOS A TUA ESPERA
        </h2>
      </div>
      <div
        ref={carouselRef}
        className="flex animate-carousel-scroll gap-4"
        style={{ animationDuration: "60s" }} // Adjust duration for speed
      >
        {duplicatedImages.map((img, index) => (
          <div key={index} className="flex-shrink-0">
            <Image
              src={img.src || "/placeholder.svg"}
              alt={img.alt}
              width={img.width}
              height={img.height}
              className="rounded-lg shadow-lg object-cover"
              style={{ width: img.width, height: img.height }} // Ensure specific sizes
              loading="lazy" // Lazy load carousel images
            />
          </div>
        ))}
      </div>
    </div>
  )
}
