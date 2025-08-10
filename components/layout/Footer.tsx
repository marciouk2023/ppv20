import Image from "next/image";
import {Facebook, Instagram, Map, Navigation, PhoneIcon as Whatsapp, Youtube} from "lucide-react";
import type React from "react";

export default function Footer () {

    const footerNavLinks = [
        { name: "Home", href: "#home", type: "link" },
        { name: "Onde Estamos", href: null, type: "text" },
        { name: "IND - Amarante", href: "#amarante", type: "link" },
        { name: "IND - Nespereira", href: "#nespereira", type: "link" },
        { name: "IND - Paris", href: "#paris", type: "link" },
        { name: "IND - Reino Unido", href: "#reino-unido", type: "link" },
    ]

    const socialLinks = [
        {
            icon: Instagram,
            href: "https://www.instagram.com/novodiapt/",
            label: "Instagram"
        },
        {
            icon: Facebook,
            href: "https://www.facebook.com/igrejanovodiaportugal/?locale=pt_PT",
            label: "Facebook"
        },
        {
            icon: Youtube,
            href: "https://www.youtube.com/@IgrejaNovoDia",
            label: "Youtube"
        }
    ]

    return (
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
                    <p className="mt-4 text-white text-lg font-semibold text-center md:text-left">
                        Igreja Evangélica no Porto <br/>Igreja Novo Dia
                    </p>
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
                                                document.getElementById(targetId)?.scrollIntoView({behavior: "smooth"})
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
                    <h3 className="text-white text-lg font-semibold mb-2">Siga a IND no Porto <br/> em todas as redes sociais</h3>
                    <div className="flex justify-center md:justify-start space-x-6">
                        {socialLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                aria-label={`Siga a Igreja Evangélica no Porto no ${link.label}`}
                                className="text-white hover:text-gray-400 transition-colors"
                            >
                                <link.icon className="h-6 w-6"/>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="text-center md:text-left">
                    <h3 className="text-white text-lg font-semibold mb-2">Endereço e Contato</h3>
                    {/* Mobile-only address with icons */}
                    <div className="md:hidden mb-2">
                        <div className="flex flex-col items-center justify-center md:justify-start space-y-1">
                            <p className="text-white text-base">Igreja Novo Dia - Porto</p>
                            <p className="text-white text-base">Rua da Alegria, 847</p>
                            <p className="text-white text-base">4000-314 - Porto</p>
                        </div>
                        <div className="flex items-center justify-center md:justify-start space-x-2 mt-2">
                            <a
                                href="https://waze.com/ul?q=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20-%204000-314%20Porto"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Navegar para a Igreja Evangélica no Porto usando o Waze"
                                className="text-white hover:text-gray-400 transition-colors"
                            >
                                <Navigation className="h-5 w-5"/>
                            </a>
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=Igreja%20Evangelica%20Novo%20Dia%20Rua%20da%20Alegria%2C%20847%20-%204000-314%20Porto"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Navegar para a Igreja Evangélica no Porto usando o Google Maps"
                                className="text-white hover:text-gray-400 transition-colors"
                            >
                                <Map className="h-5 w-5"/>
                            </a>
                        </div>
                    </div>
                    {/* Desktop address (original) */}
                    <p className="text-white text-sm mb-2 hidden md:block text-center md:text-left">Igreja Novo Dia</p>
                    <p className="text-white text-sm mb-2 hidden md:block text-center md:text-left">Rua da Alegria,
                        847</p>
                    <p className="text-white text-sm mb-2 hidden md:block text-center md:text-left">4000-314 - Porto</p>

                    {/* WhatsApp button */}
                    <a
                        href="https://wa.me/447897274321?text=Ola%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20Igreja%20Evangelica%20no%20Porto."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors mt-4"
                        aria-label="Contatar a Igreja Evangélica no Porto via WhatsApp"
                    >
                        <Whatsapp className="h-5 w-5 mr-2"/>
                        Entre em contato
                    </a>
                </div>

                {/* JESUS TE AMA! Section */}
                <div
                    className="col-span-full text-white text-4xl md:text-5xl lg:text-6xl font-extrabold text-center mt-4">
                    JESUS TE AMA!
                </div>
            </div>

            {/* Copyright */}
            <div className="mt-12 pt-8 border-t border-gray-700 text-center text-white text-sm">
                <p>Copyright 2025 - Igreja Novo Dia - Todos os direitos reservados</p>
            </div>
        </footer>
    )
}