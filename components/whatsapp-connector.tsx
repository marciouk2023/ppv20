"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, QrCode, RefreshCw, AlertTriangle, Smartphone } from "lucide-react"

// Constantes
const API_BASE_URL = "https://api.parabenspravoce.com/api"
const API_KEY = "Cara2211Msa2013+ou-6"
const POLLING_INTERVAL = 3000 // 3 segundos

export function WhatsappConnector() {
  // Estados
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean>(false)

  // Referência para o intervalo de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Limpar intervalo quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Iniciar sessão
  const startSession = async () => {
    try {
      setLoading(true)
      setError(null)
      setQrCodeUrl(null)
      setConnected(false)

      // Fazer chamada POST para iniciar sessão
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          // Você pode adicionar parâmetros adicionais aqui se necessário
          // Por exemplo: { name: "default" }
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro ao iniciar sessão: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Sessão iniciada:", data)

      // Extrair ID da sessão
      const sessionName = data.name
      if (!sessionName) {
        throw new Error("ID da sessão não encontrado na resposta")
      }

      setSessionId(sessionName)
      setStatus("STARTING")

      // Iniciar polling de status
      startStatusPolling(sessionName)
    } catch (err) {
      console.error("Erro ao iniciar sessão:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido ao iniciar sessão")
    } finally {
      setLoading(false)
    }
  }

  // Polling de status
  const startStatusPolling = (sessionName: string) => {
    // Limpar intervalo anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Iniciar novo intervalo
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Verificar status da sessão
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionName}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-API-KEY": API_KEY,
          },
        })

        if (!response.ok) {
          throw new Error(`Erro ao verificar status: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Status da sessão:", data)

        // Atualizar status
        const currentStatus = data.status || data.state
        setStatus(currentStatus)

        // Verificar se está conectado
        if (currentStatus === "CONNECTED" || currentStatus === "AUTHENTICATED") {
          setConnected(true)
          clearInterval(pollingIntervalRef.current!)
          pollingIntervalRef.current = null
          return
        }

        // Verificar se está pronto para exibir QR code
        if (currentStatus === "SCAN_QR_CODE") {
          // Parar polling e obter QR code
          clearInterval(pollingIntervalRef.current!)
          pollingIntervalRef.current = null
          fetchQrCode(sessionName)
        }
      } catch (err) {
        console.error("Erro durante polling de status:", err)
        setError(err instanceof Error ? err.message : "Erro durante verificação de status")

        // Parar polling em caso de erro
        clearInterval(pollingIntervalRef.current!)
        pollingIntervalRef.current = null
      }
    }, POLLING_INTERVAL)
  }

  // Obter QR code
  const fetchQrCode = async (sessionName: string) => {
    try {
      setLoading(true)

      // Fazer chamada GET para obter QR code
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionName}/auth/qr`, {
        method: "GET",
        headers: {
          Accept: "image/png", // Solicitar imagem
          "X-API-KEY": API_KEY,
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ao obter QR code: ${response.status} ${response.statusText}`)
      }

      // Verificar tipo de conteúdo
      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("image")) {
        // Se for imagem, converter para blob e criar URL
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setQrCodeUrl(url)
      } else if (contentType.includes("application/json")) {
        // Se for JSON, pode conter o QR code como base64
        const data = await response.json()
        if (data.qrcode) {
          setQrCodeUrl(`data:image/png;base64,${data.qrcode}`)
        } else {
          throw new Error("QR code não encontrado na resposta JSON")
        }
      } else {
        throw new Error(`Tipo de conteúdo não suportado: ${contentType}`)
      }
    } catch (err) {
      console.error("Erro ao obter QR code:", err)
      setError(err instanceof Error ? err.message : "Erro ao obter QR code")
    } finally {
      setLoading(false)
    }
  }

  // Reiniciar o processo
  const handleReset = () => {
    // Limpar intervalo se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Resetar estados
    setSessionId(null)
    setStatus(null)
    setQrCodeUrl(null)
    setLoading(false)
    setError(null)
    setConnected(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {/* Estado inicial ou erro */}
        {!sessionId && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8">
            <Smartphone className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium mb-4 text-center">Conectar WhatsApp</h3>
            <p className="text-gray-500 mb-6 text-center">
              Clique no botão abaixo para gerar um QR code e conectar sua conta do WhatsApp.
            </p>
            <Button onClick={startSession} className="bg-green-600 hover:bg-green-700" size="lg">
              <QrCode className="h-5 w-5 mr-2" />
              Conectar WhatsApp
            </Button>
          </div>
        )}

        {/* Carregando */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2 text-center">
              {status === "SCAN_QR_CODE" ? "Obtendo QR Code..." : "Iniciando conexão..."}
            </h3>
            <p className="text-gray-500 text-center">{sessionId ? `Sessão: ${sessionId}` : "Aguarde um momento..."}</p>
          </div>
        )}

        {/* Exibir QR Code */}
        {qrCodeUrl && !connected && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="border-4 border-white p-2 shadow-md mb-4 bg-white">
              <img src={qrCodeUrl || "/placeholder.svg"} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-center">Escaneie o QR Code</h3>
            <p className="text-gray-500 mb-4 text-center text-sm">
              Abra o WhatsApp no seu celular, vá em Configurações &gt; Aparelhos Conectados &gt; Conectar um Aparelho
            </p>
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-red-500 border-red-200 hover:bg-red-50"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Cancelar e Reiniciar
            </Button>
          </div>
        )}

        {/* Conectado com sucesso */}
        {connected && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2 text-center text-green-700">Conectado com Sucesso!</h3>
            <p className="text-gray-600 mb-6 text-center">Sua conta do WhatsApp está conectada e pronta para uso.</p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-center text-red-700">Erro na Conexão</h3>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
            <Button onClick={handleReset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
