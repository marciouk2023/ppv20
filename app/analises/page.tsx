"use client"

import { Sidebar } from "@/components/sidebar"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function AnalisesPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="analises" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Análises e Estatísticas</h1>
          <p className="text-gray-600 mb-6">
            Visualize estatísticas e métricas sobre seus contatos e mensagens enviadas.
          </p>

          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  )
}
