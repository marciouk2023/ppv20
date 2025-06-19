import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Sidebar() {
  return (
    <div className="flex w-80 flex-col border-r border-gray-800 bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="#" className="text-lg font-semibold" prefetch={false}>
            freudexplica.ai
          </Link>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <Button className="mb-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gray-800 text-lg font-medium text-gray-50 hover:bg-gray-700">
          <Plus className="h-5 w-5" />
          Agendar uma consulta com psicanalista real
        </Button>
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm font-medium text-gray-400">
            Últimas conversas
            <Button variant="ghost" size="sm" className="text-orange-500 hover:bg-transparent hover:text-orange-400">
              <Plus className="mr-1 h-4 w-4" />
              Nova
            </Button>
          </div>
          <p className="text-sm text-gray-500">Faça login para ver suas conversas</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400">Psicanalistas</h3>
          <div className="grid gap-3">
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>SF</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Sigmund Freud</div>
                <div className="text-sm text-gray-400">Pai da Psicanálise</div>
              </div>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>CJ</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Carl Jung</div>
                <div className="text-sm text-gray-400">Psicologia Analítica</div>
              </div>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>PT</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Psicoterapeuta Psicodinâ...</div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  Arqueólogo da Psique
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">Novo</span>
                </div>
              </div>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>JL</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Jacques Lacan</div>
                <div className="text-sm text-gray-400">Psicanálise Estruturalista</div>
              </div>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Melanie Klein</div>
                <div className="text-sm text-gray-400">Teoria das Relações Objetais</div>
              </div>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800" prefetch={false}>
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>AF</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">Anna Freud</div>
                <div className="text-sm text-gray-400">Psicanalista</div>
              </div>
            </Link>
          </div>
        </div>
      </ScrollArea>
      <div className="border-t border-gray-800 p-4">
        <Button className="mb-3 h-12 w-full rounded-xl bg-gray-800 text-lg font-medium text-gray-50 hover:bg-gray-700">
          Libera Freud Premium
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl border-gray-700 text-lg font-medium text-gray-50 hover:bg-gray-800"
        >
          Entrar ou Criar Conta
        </Button>
      </div>
    </div>
  )
}
