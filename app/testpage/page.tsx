"use client"

import { Sidebar } from "@/components/sidebar"

export default function TestPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      <Sidebar activePage="agendamento" />
      <div className="flex-1 p-6 ml-[196px]">
        <h1>Agendamento de Mensagens</h1>
        <p>Versão mínima para teste</p>
      </div>
    </div>
  )
}
