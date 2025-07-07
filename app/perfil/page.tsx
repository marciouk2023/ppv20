"use client"

import { Sidebar } from "@/components/sidebar"
import { UserProfile } from "@/components/user-profile"
import { WhatsAppStatusMonitor } from "@/components/whatsapp-status-monitor"

export default function PerfilPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="configuracoes" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Perfil e Configurações</h1>
          <p className="text-gray-600 mb-6">Gerencie seu perfil, configurações e preferências do sistema</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <UserProfile />
            <WhatsAppStatusMonitor />
          </div>
        </div>
      </div>
    </div>
  )
}
