"use client"

import { AudioRecorderFirebase } from "@/components/audio-recorder-firebase"
import { Sidebar } from "@/components/sidebar"

export default function FirebaseAudioDemoPage() {
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="mensagens" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-6">Firebase Audio Recorder</h1>
          <p className="text-gray-600 mb-6">
            Grave, salve e envie mensagens de áudio para WhatsApp com armazenamento no Firebase
          </p>

          <AudioRecorderFirebase />

          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h2 className="text-lg font-medium text-amber-800 mb-2">Configuração Necessária</h2>
            <p className="text-amber-700 mb-2">
              Para usar este componente, você precisa configurar as seguintes variáveis de ambiente:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-700">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
              <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
