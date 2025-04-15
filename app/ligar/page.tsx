"use client"

import { Sidebar } from "@/components/sidebar"
import { WhatsappConnector } from "@/components/whatsapp-connector"

export default function WhatsappConnectPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="configuracoes" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Conexão WhatsApp</h1>
          <p className="text-gray-600 mb-6">Conecte sua conta do WhatsApp para enviar mensagens automáticas</p>

          <div className="grid grid-cols-1 gap-6">
            <WhatsappConnector />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Informações Importantes</h3>
              <ul className="list-disc pl-5 space-y-2 text-blue-700">
                <li>Mantenha seu celular conectado à internet para que a conexão permaneça ativa.</li>
                <li>Você pode conectar até 4 dispositivos simultâneos à sua conta do WhatsApp.</li>
                <li>Para desconectar, vá em WhatsApp &gt; Configurações &gt; Aparelhos Conectados.</li>
                <li>Utilize a API oficial ou APIs compatíveis. Siga as políticas de uso do WhatsApp.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
