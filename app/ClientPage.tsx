"use client"

import type React from "react"

import Image from "next/image"
import { MenuIcon, Instagram, PhoneIcon as Whatsapp, Map, Navigation, CalendarDays, Clock } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import ImageCarousel from "@/components/image-carousel"
import TestimonialCarousel from "@/components/testimonial-carousel"
import { inter, robotoMono, lato } from "@/styles/fonts"
import { useEffect, useState } from "react"
import { Suspense } from "react"

// Componente de carregamento para lazy loading
const LoadingPlaceholder = () => <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg"></div>

export default function ClientPage() {
  // Estado para controlar imagens que estão no viewport
  const [imagesInView, setImagesInView] = useState<boolean>(false)

  // Efeito para detectar quando o usuário rola para seções com imagens
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImagesInView(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 },
    )

    const sections = document.querySelectorAll("section")
    sections.forEach((section) => {
      observer.observe(section)
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const navLinks = [
    { name: "HOME", href: "#home" },
    { name: "FAÇA PARTE", href: "#faca-parte" },
    { name: "HORÁRIOS", href: "#horarios" },
    { name: "COMO CHEGAR", href: "#como-chegar" },
    { name: "CONTATOS", href: "#contatos" },
  ]

  const footerNavLinks = [
    { name: "Home", href: "#home", type: "link" },
    { name: "Onde Estamos", href: null, type: "text" },
    { name: "IND - Amarante", href: "#amarante", type: "link" },
    { name: "IND - Nespereira", href: "#nespereira", type: "link" },
    { name: "IND - Paris", href: "#paris", type: "link" },
    { name: "IND - Reino Unido", href: "#reino-unido", type: "link" },
  ]

  const socialLinks = [{ icon: Instagram, href: "https://www.instagram.com/novodiapt/", label: "Instagram" }]

  const carouselImages = [
    {
      src: "/images/carousel-image-1.jpeg",
      alt: "Igreja Evangélica no Porto - Comunidade acolhedora",
      width: 300,
      height: 200,
    },
    {
      src: "/images/carousel-image-2.jpeg",
      alt: "Culto na Igreja Evangélica no Porto",
      width: 250,
      height: 350,
    },
    {
      src: "/images/carousel-image-3.jpeg",
      alt: "Momentos de adoração na Igreja Evangélica no Porto",
      width: 400,
      height: 250,
    },
    {
      src: "/images/carousel-image-4.jpeg",
      alt: "Comunidade da Igreja Evangélica no Porto em celebração",
      width: 350,
      height: 220,
    },
    {
      src: "/images/carousel-image-5.jpeg",
      alt: "Eventos especiais na Igreja Evangélica no Porto",
      width: 280,
      height: 380,
    },
    {
      src: "/images/carousel-image-6.jpeg",
      alt: "Membros da Igreja Evangélica no Porto em comunhão",
      width: 320,
      height: 200,
    },
  ]

  const testimonials = [
    {
      image:
        "https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20evangelica%20porto%20cidade.webp?alt=media&token=65a222e1-1078-49b2-90d8-b4a203e044c2",
      name: "Voltei a sonhar",
      jobTitle: "Fatima Santos",
      text: "Nesta comunidade da Igreja Evangélica no Porto, encontrei na Igreja Novo Dia a força e a inspiração para reacender meus sonhos e seguir em frente com fé e propósito.",
      title: "Uma Experiência Transformadora",
      rating: 5,
    },
    {
      image:
        "https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20porto%20evangelica.webp?alt=media&token=32d480dc-8a7d-4ccd-a899-89ec755c7a76",
      name: "Uma igreja biblica",
      jobTitle: "Arlan Lima",
      text: "É um privilégio fazer parte da Igreja Evangélica no Porto Novo Dia que se baseia firmemente na Palavra de Deus, trazendo clareza e direção para a vida.",
      title: "Paz e Conexão Profunda",
      rating: 5,
    },
    {
      image:
        "https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20evangelica%20porto%20cidade%20portugal.webp?alt=media&token=64819e26-60c7-4fdb-8daf-69e8bb8f3426",
      name: "Um lugar para meus filhos",
      jobTitle: "Jaize Buliê",
      text: "Finalmente, um ambiente seguro e acolhedor na Igreja Novo Dia onde meus filhos podem crescer na fé e desenvolver valores cristãos sólidos.",
      title: "Comunidade Acolhedora",
      rating: 5,
    },
    {
      image:
        "https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20evangelica%20na%20cidade%20do%20porto.webp?alt=media&token=cba8dc79-b7da-40e2-9d38-8b608de87c7e",
      name: "Adoração Cristocêntrica",
      jobTitle: "Cauan Brito",
      text: "A adoração é verdadeiramente centrada em Cristo, porque entendemos que na verdade tudo é sobre ELE",
      title: "Cultos Inspiradores",
      rating: 5,
    },
  ]

  // Função para lidar com a rolagem suave
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace("#", "")
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${inter.variable} ${robotoMono.variable} ${lato.variable} font-sans`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-6 md:px-6 lg:px-8 bg-white">
        <div className="flex items-center flex-shrink-0">
          <Image
            src="/images/igreja_evangelica_no_porto.jpg"
            alt="Igreja Evangélica no Porto - Logo Oficial"
            width={180}
            height={60}
            className="h-auto max-h-[50px] md:max-h-[60px] w-auto"
            priority // Marca como prioritária para carregamento rápido (LCP)
          />
          <span className="ml-2 md:ml-4 text-black text-sm md:text-lg font-semibold">Igreja Evangélica no Porto</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:block" aria-label="Navegação principal">
          <ul className="flex space-x-6 lg:space-x-8">
            {navLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="text-black text-lg font-semibold hover:text-gray-700 transition-colors"
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <MenuIcon className="h-8 w-8" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col space-y-4" aria-label="Menu móvel">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-black text-xl font-semibold hover:text-gray-700 transition-colors py-2"
                    onClick={(e) => {
                      handleSmoothScroll(e, link.href)
                      document.querySelector("[data-radix-collection-item]")?.click() // Fecha o menu
                    }}
                  >
                    {link.name}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1">
        {/* Hero Section - Otimizado para LCP */}
        <section
          id="home"
          className="relative flex flex-col items-center justify-center h-[60vh] md:h-[70vh] lg:h-[80vh] text-center px-4 py-16"
        >
          {/* Usando div com background-image em vez de style inline para melhor performance */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20evangelica.webp?alt=media&token=affb563c-cc5b-448d-bf7d-28cd817bcaf4')`,
            }}
            aria-hidden="true"
          ></div>
          <div className="absolute inset-0 bg-black opacity-40" aria-hidden="true"></div>
          <div className="relative z-10 space-y-6">
            <h1 className="text-white text-3xl sm:text-4xl md:text-6xl font-lato font-bold uppercase leading-tight tracking-wider max-w-4xl mx-auto text-shadow-lg lg:text-5xl">
              Toda história tem um ponto de virada - TALVEZ A SUA COMEÇA AQUI
            </h1>
            <div className="w-24 h-1 bg-onda-yellow mx-auto"></div>
            <div className="flex sm:flex-row justify-center mt-32 tracking-tight leading-3 leading-4 leading-7 items-end flex-col gap-y-3 mb-11 px-32 py-0">
              <Button
                asChild
                className="bg-white text-onda-dark-blue hover:bg-gray-200 transition-colors px-4 sm:px-8 font-semibold shadow-lg text-lg py-7 sm:py-6 rounded-xl w-[90%] sm:w-auto mx-auto sm:mx-0"
              >
                <a href="#como-chegar" onClick={(e) => handleSmoothScroll(e, "#como-chegar")}>
                  Como chegar até nós
                </a>
              </Button>
              <Button
                asChild
                className="text-white hover:bg-green-600 transition-colors px-4 sm:px-8 font-semibold shadow-lg rounded-xl text-lg py-7 sm:py-6 bg-green-600 w-[90%] sm:w-auto mx-auto sm:mx-0"
              >
                <a
                  href="https://wa.me/447897274321?text=Ola%2C%20gostaria%20de%20mais%20informacoes%20sobre%20a%20igreja%20evangelica%20no%20porto"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entre em contato
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Um lugar para parar... e pertencer Section */}
        <section id="faca-parte" className="bg-onda-light-gray py-8 md:py-12 lg:py-16 px-4 text-center">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center md:gap-y-5 md:gap-x-72">
            {/* Coluna Esquerda: Conteúdo de Texto */}
            <div className="text-center md:text-left space-y-6">
              <h2 className="text-black text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter">
                IGREJA EVANGÉLICA NO PORTO - UM LUGAR PARA VISITAR E PERTENCER
              </h2>
              <p className="text-black text-lg md:text-xl font-sans leading-relaxed">
                Num mundo de pressa e solidão, a Igreja Evangélica no Porto - IND (Igreja Novo Dia) é um convite ao
                descanso. Em Jesus encontramos descanso, e em comunidade encontramos abrigo. Aqui, ninguém é estranho —
                todos são bem-vindos na nossa igreja evangélica no centro do Porto.
              </p>
            </div>
            {/* Coluna Direita: Espaço para Imagem */}
            <div className="flex justify-center md:justify-end">
              <Suspense fallback={<LoadingPlaceholder />}>
                <Image
                  src="/images/um-lugar-para-pertencer.jpeg"
                  alt="Igreja Evangélica no Porto - Comunidade acolhedora e inclusiva"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg object-cover w-full max-w-md md:max-w-none"
                  loading="lazy" // Carregamento lazy para imagens abaixo da dobra
                />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Image Carousel Section - Carregado sob demanda */}
        {imagesInView && (
          <section aria-labelledby="carousel-heading">
            <h2 id="carousel-heading" className="sr-only">
              Galeria de Imagens da Igreja Evangélica no Porto
            </h2>
            <ImageCarousel images={carouselImages} />
          </section>
        )}

        {/* Testimonial Section - Carregado sob demanda */}
        {imagesInView && (
          <section aria-labelledby="testimonial-heading">
            <h2 id="testimonial-heading" className="sr-only">
              Testemunhos dos membros da Igreja Evangélica no Porto
            </h2>
            <TestimonialCarousel testimonials={testimonials} />
          </section>
        )}

        {/* New Section: Horários */}
        <section id="horarios" className="relative py-16 md:py-24 lg:py-32 px-4 text-center bg-cover bg-center">
          {/* Usando div com background-image em vez de style inline para melhor performance */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/igreja%20evangelica%20porto.jpg?alt=media&token=f805deb7-8fc8-4403-beee-c5f5fc9e7b24')`,
            }}
            aria-hidden="true"
          ></div>
          <div className="absolute inset-0 bg-black opacity-60" aria-hidden="true"></div>
          <div className="relative z-10 max-w-6xl mx-auto space-y-12">
            <h2 className="text-white text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              HORÁRIOS DE CULTO - IGREJA EVANGÉLICA NO PORTO
            </h2>
            <p className="text-white text-lg md:text-xl font-sans leading-relaxed max-w-3xl mx-auto text-shadow-lg">
              Junte-se a nós em nossos cultos semanais na Igreja Evangélica no Porto.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Horário de Domingo */}
              <div className="flex flex-col items-center space-y-4 p-6 bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm">
                <CalendarDays className="h-12 w-12 text-onda-dark-blue" />
                <h3 className="text-black text-3xl font-bold uppercase">Domingo</h3>
                <div className="flex items-center space-x-2 text-black text-2xl font-semibold">
                  <Clock className="h-6 w-6" />
                  <span>10:00h</span>
                </div>
                <p className="text-black text-base font-sans leading-relaxed">
                  Culto principal da Igreja Evangélica no Porto com louvor, palavra e comunhão.
                </p>
              </div>

              {/* Horário de Sexta-feira */}
              <div className="flex flex-col items-center space-y-4 p-6 bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm">
                <CalendarDays className="h-12 w-12 text-onda-dark-blue" />
                <h3 className="text-black text-3xl font-bold uppercase">Sexta-feira</h3>
                <div className="flex items-center space-x-2 text-black text-2xl font-semibold">
                  <Clock className="h-6 w-6" />
                  <span>20:30h</span>
                </div>
                <p className="text-black text-base font-sans leading-relaxed">
                  Reunião de oração e estudo da palavra na Igreja Evangélica no Porto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* New Section: Gathering Information */}
        <section id="como-chegar" className="bg-white py-16 md:py-24 lg:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Coluna 1: Texto e botões */}
              <div className="space-y-8">
                <div className="text-left space-y-6">
                  <h2 className="text-black text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide">
                    COMO CHEGAR À IGREJA EVANGÉLICA NO PORTO?
                  </h2>
                  <p className="text-black text-lg md:text-xl lg:text-2xl font-sans leading-relaxed">
                    No centro da cidade do Porto, está a Igreja Evangélica Novo Dia.
                    <br />
                    <strong>Rua da Alegria, 847 - Porto</strong>
                    <br />
                    És nosso(a) convidado(a) para conhecer a IND - Porto
                  </p>
                </div>

                {/* Two Columns: Waze and Google Maps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Waze Column */}
                  <a
                    href="https://waze.com/ul?q=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20Porto%20Portugal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center space-y-4 hover:opacity-80 transition-opacity"
                    aria-label="Navegar para a Igreja Evangélica no Porto usando o Waze"
                  >
                    <img
                      src="https://brandlogos.net/wp-content/uploads/2025/05/waze_app_icon-logo_brandlogos.net_l82da.png"
                      alt="Waze - Navegação para a Igreja Evangélica no Porto"
                      className="w-16 h-16 object-contain"
                      width="64"
                      height="64"
                      loading="lazy"
                    />
                    <span className="text-black text-sm font-medium text-center">Abrir no Waze</span>
                  </a>

                  {/* Google Maps Column */}
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20Porto%20Portugal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center space-y-4 hover:opacity-80 transition-opacity"
                    aria-label="Navegar para a Igreja Evangélica no Porto usando o Google Maps"
                  >
                    <img
                      src="https://images.seeklogo.com/logo-png/26/1/new-google-maps-icon-logo-png_seeklogo-268336.png"
                      alt="Google Maps - Localização da Igreja Evangélica no Porto"
                      className="w-16 h-16 object-contain"
                      width="64"
                      height="64"
                      loading="lazy"
                    />
                    <span className="text-black text-sm font-medium text-center">Abrir no Google Maps</span>
                  </a>
                </div>
              </div>

              {/* Coluna 2: Mapa - Carregado sob demanda */}
              <div className="w-full rounded-lg shadow-lg overflow-hidden h-[500px]">
                {imagesInView ? (
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d300.00000000000006!2d-8.600000000000001!3d41.14961!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd2464e000000000%3A0x0!2sIgreja%20Evangelica%20Novo%20Dia%2C%20Rua%20da%20Alegria%2C%20847%2C%204000-314%20Porto%2C%20Portugal!5e0!3m2!1sen!2spt!4v1718246000000!5m2!1sen!2spt"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    aria-label="Mapa de localização da Igreja Evangélica no Porto"
                    title="Mapa da Igreja Evangélica no Porto - Rua da Alegria, 847"
                  ></iframe>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <p>Mapa carregando...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* New Section: CTA Fale Conosco */}
        <section
          id="contatos"
          className="bg-onda-dark-blue py-16 md:py-24 lg:py-32 px-4 text-center flex flex-col items-center justify-center"
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-white text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              CONTATO - IGREJA EVANGÉLICA NO PORTO
            </h2>
            <p className="text-white text-lg md:text-xl font-sans leading-relaxed max-w-3xl mx-auto text-shadow-lg">
              Tem alguma pergunta ou precisa de ajuda? Entre em contato com a Igreja Evangélica no Porto!
            </p>
            <Button
              asChild
              className="inline-flex items-center justify-center border border-transparent rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors shadow-lg tracking-normal leading-7 font-medium py-8 px-14 text-xl"
            >
              <a
                href="https://wa.me/447897274321?text=Ola%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20Igreja%20Evangelica%20no%20Porto."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contatar a Igreja Evangélica no Porto via WhatsApp"
              >
                <Whatsapp className="h-6 w-6 mr-3" />
                FALE CONOSCO
              </a>
            </Button>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="bg-onda-dark-blue text-white py-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12">
          {/* Logo Section */}
          <div className="flex flex-col items-center md:items-start">
            <Image
              src="/images/igreja_evangelica_no_porto.jpg"
              alt="Igreja Evangélica no Porto - Logo Oficial"
              width={180}
              height={60}
              className="h-auto max-h-[60px] w-auto"
              loading="lazy"
            />
            <p className="mt-4 text-white text-lg font-semibold text-center md:text-left">Igreja Evangélica no Porto</p>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:block">
            <h3 className="text-white text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-4 text-base">
              {footerNavLinks.map((link) => (
                <li key={link.name} className="flex items-center">
                  {link.type === "link" ? (
                    <a
                      href={link.href}
                      className="text-white text-lg hover:text-gray-400 transition-colors"
                      onClick={(e) => {
                        if (link.href?.startsWith("#")) {
                          e.preventDefault()
                          const targetId = link.href.replace("#", "")
                          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })
                        }
                      }}
                    >
                      {link.name}
                    </a>
                  ) : (
                    <span className="text-white text-lg font-semibold">{link.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div className="text-center md:text-left">
            <h3 className="text-white text-lg font-semibold mb-2">
              Siga a Igreja Evangélica no Porto nas redes sociais
            </h3>
            <div className="flex justify-center md:justify-start space-x-6">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={`Siga a Igreja Evangélica no Porto no ${link.label}`}
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <link.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h3 className="text-white text-lg font-semibold mb-2">Endereço e Contato</h3>
            {/* Mobile-only address with icons */}
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2 md:hidden">
              <p className="text-white text-base">
                Igreja Evangélica no Porto - Rua da Alegria, 847 - 4000-314 - Porto
              </p>
              <a
                href="https://waze.com/ul?q=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20-%204000-314%20Porto"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Navegar para a Igreja Evangélica no Porto usando o Waze"
                className="text-white hover:text-gray-400 transition-colors"
              >
                <Navigation className="h-5 w-5" />
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20-%204000-314%20Porto"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Navegar para a Igreja Evangélica no Porto usando o Google Maps"
                className="text-white hover:text-gray-400 transition-colors"
              >
                <Map className="h-5 w-5" />
              </a>
            </div>
            {/* Desktop address (original) */}
            <p className="text-white text-sm mb-2 hidden md:block text-center md:text-left">
              Igreja Novo Dia - Rua da Alegria, 847 - 4000-314 - Porto
            </p>

            {/* WhatsApp button */}
            <a
              href="https://wa.me/447897274321?text=Ola%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20Igreja%20Evangelica%20no%20Porto."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors mt-4"
              aria-label="Contatar a Igreja Evangélica no Porto via WhatsApp"
            >
              <Whatsapp className="h-5 w-5 mr-2" />
              Entre em contato
            </a>
          </div>

          {/* JESUS TE AMA! Section */}
          <div className="col-span-full text-white text-4xl md:text-5xl lg:text-6xl font-extrabold text-center mt-4">
            JESUS TE AMA!
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-700 text-center text-white text-sm">
          <p>Copyright 2025 - Igreja Novo Dia - Todos os direitos reservados</p>
        </div>
      </footer>
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
            description:
              "Igreja Evangélica no Porto - IND (Igreja Novo Dia) é uma comunidade cristã acolhedora no centro do Porto.",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Rua da Alegria, 847",
              addressLocality: "Porto",
              postalCode: "4000-314",
              addressCountry: "PT",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: "41.14961",
              longitude: "-8.60000",
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
