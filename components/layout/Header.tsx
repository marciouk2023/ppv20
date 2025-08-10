import Image from "next/image";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Button} from "@/components/ui/button";
import {MenuIcon} from "lucide-react";
import type React from "react";
import {handleSmoothScroll} from "@/utils/handleSmoothScroll";
import {lato, montserrat} from "@/styles/fonts";

export default function Header () {

    const navLinks = [
        { name: "HOME", href: "#home" },
        { name: "FAÇA PARTE", href: "#faca-parte" },
        { name: "HORÁRIOS", href: "#horarios" },
        { name: "COMO CHEGAR", href: "#como-chegar" },
        { name: "CONTATOS", href: "#contatos" },
    ]

    return (
        <div>
            <header className="absolute top-0 left-0 w-full flex items-center justify-between px-4 py-6 md:px-6 lg:px-8 bg-transparent z-20">
                <div className="flex items-center flex-shrink-0">
                    <Image
                        src="/images/igreja_evangelica_no_porto.png"
                        alt="Igreja Evangélica no Porto - Logo Oficial"
                        width={180}
                        height={60}
                        className="h-auto max-h-[60px] md:max-h-[70px] w-auto"
                        priority
                    />
                    <span className={`${montserrat.variable} font-montserrat ml-2 md:ml-4 text-white text-sm md:text-lg font-bold`}>IGREJA EVANGÉLICA NO PORTO</span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:block" aria-label="Navegação principal">
                    <ul className="flex space-x-6 lg:space-x-8">
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                <a
                                    href={link.href}
                                    className="text-white text-lg font-semibold hover:text-[#344156] transition-colors"
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
                                <MenuIcon className="h-12 w-12 text-white"/>
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
                                            document.querySelector("[data-radix-collection-item]")?.click()
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
                    <h1 className={`text-3xl sm:text-4xl md:text-6xl ${montserrat.variable} font-montserrat font-bold uppercase leading-tight tracking-wider max-w-4xl mx-auto text-shadow-lg lg:text-5xl`}>
                        <span className="text-white">Seu</span>{' '}
                        <span className="text-[#344156] font-black border-b-2 border-white" style={{ fontWeight: 900 }}>Novo Dia</span>{' '}
                        <span className="text-white">começa aqui</span>
                    </h1>
                    <div>
                        <Button
                            asChild
                            className={`px-4 py-3 ${montserrat.variable} font-montserrat font-semibold rounded-md`}
                            style={{
                                backgroundColor: 'rgba(52, 65, 86, 0.75)',
                                color: 'white',
                            }}
                        >
                            <a href="#como-chegar" onClick={(e) => handleSmoothScroll(e, "#como-chegar")}>
                                Como chegar até nós
                            </a>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}