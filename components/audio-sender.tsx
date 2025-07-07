"use client"

import { useState } from "react"
import { enviarAudioDirect } from "@/utils/audioRecorderDirect" // Ajuste o caminho conforme necessário

// Componente de exemplo
export function AudioSender() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSendAudio = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      // Exemplo de parâmetros
      const phone = "447897274321" // Número de telefone
      const audioUrl = "https://example.com/audio.mp3" // URL do áudio
      const sessionName = "default" // Nome da sessão

      // Chamada da função
      const response = await enviarAudioDirect(phone, audioUrl, sessionName)

      // Registro do sucesso
      setResult(response)
      console.log("Áudio enviado com sucesso:", response)
    } catch (err) {
      // Registro do erro
      setError(err.message || "Erro desconhecido")
      console.error("Erro ao enviar áudio:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSendAudio}
        disabled={isLoading}
        style={{
          padding: "8px 16px",
          backgroundColor: isLoading ? "#ccc" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Enviando..." : "Enviar Áudio"}
      </button>

      {error && (
        <div
          style={{ marginTop: "10px", color: "red", padding: "10px", backgroundColor: "#ffebee", borderRadius: "4px" }}
        >
          Erro: {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "10px",
            color: "green",
            padding: "10px",
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
          }}
        >
          Áudio enviado com sucesso!
        </div>
      )}
    </div>
  )
}
