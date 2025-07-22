import Image from "next/image";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {Button} from "@/components/ui/button";
import {MenuIcon} from "lucide-react";
import type React from "react";
import {handleSmoothScroll} from "@/utils/handleSmoothScroll";

export default function Header () {

    const navLinks = [
        { name: "HOME", href: "#home" },
        { name: "FAÇA PARTE", href: "#faca-parte" },
        { name: "HORÁRIOS", href: "#horarios" },
        { name: "COMO CHEGAR", href: "#como-chegar" },
        { name: "CONTATOS", href: "#contatos" },
    ]

    return (
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
                <span
                    className="ml-2 md:ml-4 text-black text-sm md:text-lg font-semibold">Igreja Evangélica no Porto</span>
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
                            <MenuIcon className="h-8 w-8"/>
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
    )
}