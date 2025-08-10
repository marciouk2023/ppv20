import {Button} from "@/components/ui/button";
import React, {Suspense, useEffect, useState} from "react";
import Image from "next/image";
import ImageCarousel from "@/components/image-carousel";
import TestimonialCarousel from "@/components/testimonial-carousel";
import {CalendarDays, Clock, PhoneIcon as Whatsapp} from "lucide-react";
import {handleSmoothScroll} from "@/utils/handleSmoothScroll";
import LoadingPlaceholder from "@/components/LoadingPlaceholder";
import {montserrat, poppins} from "@/styles/fonts";

export default function Main() {

    const [imagesInView, setImagesInView] = useState<boolean>(false)
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

    return (
        <main className="flex-1">
            <section id="faca-parte" className="bg-onda-light-gray py-8 md:py-12 lg:py-16 px-4 text-center">
                <div
                    className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center md:gap-y-5 md:gap-x-72">
                    <div className="text-center md:text-left space-y-6">
                        <h2 className={`${montserrat.variable} font-montserrat text-black text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter`}>
                            <span className="hidden md:inline">IGREJA EVANGÉLICA NO PORTO - </span>UM LUGAR PARA VISITAR
                            E PERTENCER
                        </h2>
                        <p className={`${poppins.variable} font-poppins text-black text-lg md:text-xl font-sans leading-relaxed`}>
                            Num mundo de pressa e solidão, a Igreja Evangélica no Porto - IND (Igreja Novo Dia) é um
                            convite ao
                            descanso. Em Jesus encontramos descanso, e em comunidade encontramos abrigo. Aqui, ninguém é
                            estranho —
                            todos são bem-vindos na nossa igreja evangélica no centro do Porto.
                        </p>
                    </div>
                    <div className="flex justify-center md:justify-end">
                        <Suspense fallback={<LoadingPlaceholder/>}>
                            <Image
                                src="/images/um-lugar-para-pertencer.jpeg"
                                alt="Igreja Evangélica no Porto - Comunidade acolhedora e inclusiva"
                                width={600}
                                height={400}
                                className="rounded-lg shadow-lg object-cover w-full max-w-md md:max-w-none"
                                loading="lazy"
                            />
                        </Suspense>
                    </div>
                </div>
            </section>

            {imagesInView && (
                <section aria-labelledby="carousel-heading">
                    <h2 id="carousel-heading" className="sr-only">
                        Galeria de Imagens da Igreja Evangélica no Porto
                    </h2>
                    <ImageCarousel images={carouselImages}/>
                </section>
            )}

            {imagesInView && (
                <section aria-labelledby="testimonial-heading">
                    <h2 id="testimonial-heading" className="sr-only">
                        Testemunhos dos membros da Igreja Evangélica no Porto
                    </h2>
                    <TestimonialCarousel testimonials={testimonials}/>
                </section>
            )}

            <section id="horarios" className="relative py-16 md:py-24 lg:py-32 px-4 text-center bg-cover bg-center">
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
                        <div
                            className="flex flex-col items-center space-y-4 p-6 bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm">
                            <CalendarDays className="h-12 w-12 text-onda-dark-blue"/>
                            <h3 className="text-black text-3xl font-bold uppercase">Domingo</h3>
                            <div className="flex items-center space-x-2 text-black text-2xl font-semibold">
                                <Clock className="h-6 w-6"/>
                                <span>10:00h</span>
                            </div>
                            <p className="text-black text-base font-sans leading-relaxed">
                                Culto principal da Igreja Evangélica no Porto com louvor, palavra e comunhão.
                            </p>
                        </div>

                        <div
                            className="flex flex-col items-center space-y-4 p-6 bg-white bg-opacity-95 rounded-lg shadow-lg backdrop-blur-sm">
                            <CalendarDays className="h-12 w-12 text-onda-dark-blue"/>
                            <h3 className="text-black text-3xl font-bold uppercase">Sexta-feira</h3>
                            <div className="flex items-center space-x-2 text-black text-2xl font-semibold">
                                <Clock className="h-6 w-6"/>
                                <span>20:30h</span>
                            </div>
                            <p className="text-black text-base font-sans leading-relaxed">
                                Reunião de oração e estudo da palavra na Igreja Evangélica no Porto.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="como-chegar" className="bg-white py-16 md:py-24 lg:py-32 px-4 hidden md:block">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="space-y-8">
                            <div className="text-left space-y-6">
                                <h2 className="text-black text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-tight tracking-wide">
                                    COMO CHEGAR À IGREJA EVANGÉLICA NO PORTO?
                                </h2>
                                <p className="text-black text-lg md:text-xl lg:text-2xl font-sans leading-relaxed">
                                    No centro da cidade do Porto, está a Igreja Evangélica Novo Dia.
                                    <br/>
                                    <strong>Rua da Alegria, 847 - Porto</strong>
                                    <br/>
                                    És nosso(a) convidado(a) para conhecer a IND - Porto
                                </p>
                            </div>

                            <div className="flex sm:grid sm:grid-cols-2 gap-6 justify-center">
                                <a
                                    href="https://waze.com/ul?q=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20Porto%20Portugal"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center space-y-2 sm:space-y-4 hover:opacity-80 transition-opacity px-4 sm:px-0"
                                    aria-label="Navegar para a Igreja Evangélica no Porto usando o Waze"
                                >
                                    <img
                                        src="https://brandlogos.net/wp-content/uploads/2025/05/waze_app_icon-logo_brandlogos.net_l82da.png"
                                        alt="Waze - Navegação para a Igreja Evangélica no Porto"
                                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                                        width="64"
                                        height="64"
                                        loading="lazy"
                                    />
                                    <span className="text-black text-sm font-medium text-center">Abrir no Waze</span>
                                </a>

                                <a
                                    href="https://www.google.com/maps/search/?api=1&query=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20Porto%20Portugal"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center space-y-2 sm:space-y-4 hover:opacity-80 transition-opacity px-4 sm:px-0"
                                    aria-label="Navegar para a Igreja Evangélica no Porto usando o Google Maps"
                                >
                                    <img
                                        src="https://images.seeklogo.com/logo-png/26/1/new-google-maps-icon-logo-png_seeklogo-268336.png"
                                        alt="Google Maps - Localização da Igreja Evangélica no Porto"
                                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                                        width="64"
                                        height="64"
                                        loading="lazy"
                                    />
                                    <span
                                        className="text-black text-sm font-medium text-center">Abrir no Google Maps</span>
                                </a>
                            </div>
                        </div>

                        <div className="w-full rounded-lg shadow-lg overflow-hidden h-[500px] hidden md:block">
                            {imagesInView ? (
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d300.00000000000006!2d-8.601594829782256!3d41.15866403622216!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd2464e000000000%3A0x0!2sIgreja%20Evangelica%20Novo%20Dia%2C%20Rua%20da%20Alegria%2C%20847%2C%204000-314%20Porto%2C%20Portugal!5e0!3m2!1sen!2spt!4v1718246000000!5m2!1sen!2spt"
                                    width="100%"
                                    height="100%"
                                    style={{border: 0}}
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
                            <Whatsapp className="h-6 w-6 mr-3"/>
                            FALE CONOSCO
                        </a>
                    </Button>
                </div>
            </section>
        </main>
    )
}