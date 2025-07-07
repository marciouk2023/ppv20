"use client"

import { AudioRecorderWhatsApp } from "@/components/audio-recorder-whatsapp"
import { Sidebar } from "@/components/sidebar"

export default function AudioDemoPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="mensagens" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-6">Demonstração de Áudio WhatsApp</h1>

          <AudioRecorderWhatsApp />
        </div>
      </div>
    </div>
  )
}
