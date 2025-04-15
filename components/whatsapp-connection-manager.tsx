"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Smartphone, Loader2, Check, AlertTriangle, RefreshCw, Info } from "lucide-react"
import whatsAppService from "@/utils/whatsappService"

export function WhatsAppConnectionManager() {
  const [status, setStatus] = useState<string>("DISCONNECTED")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [lastConnection, setLastConnection] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Inicializar o serviço com callback de status
  useEffect(() => {
    whatsAppService.setStatusChangeCallback((newStatus, data) => {
      console.log(`WhatsApp status changed: ${newStatus}`, data)
      setStatus(newStatus)

      // Processar dados específicos do status
      if (newStatus === "QR_READY" && data.qrCode) {
        setQrCode(data.qrCode.qrCode || data.qrCode)
      } else if (newStatus === "ERROR") {
        setError(data.error?.message || data.message || "Erro desconhecido")
        setQrCode(null)
      } else if (newStatus === "CONNECTED") {
        setQrCode(null)
        setError(null)
        setLastConnection(new Date().toLocaleString())
      } else if (newStatus === "TIMEOUT") {
        setError("Tempo limite excedido ao aguardar o QR code. Tente novamente.")
        setQrCode(null)
      }
    })

    // Verificar status inicial se o usuário estiver logado
    if (user?.email) {
      checkInitialStatus()
    }

    return () => {
      // Limpar callback ao desmontar
      whatsAppService.setStatusChangeCallback(null)
    }
  }, [user])

  // Verificar status inicial da conexão
  const checkInitialStatus = async () => {
    if (!user?.email) return

    try {
      setIsLoading(true)

      // Verificar se há uma sessão ativa para o usuário
      const response = await fetch(`/api/whatsapp/check-session?userEmail=${encodeURIComponent(user.email)}`)
      const data = await response.json()

      if (data.hasSession && data.sessionName) {
        setSessionName(data.sessionName)

        // Verificar status da sessão
        const statusResponse = await fetch(`/api/whatsapp/sessions/${data.sessionName}/status`)
        const statusData = await statusResponse.json()

        if (
          statusData.connected ||
          statusData.authenticated ||
          statusData.status === "CONNECTED" ||
          statusData.status === "WORKING"
        ) {
          setStatus("CONNECTED")
          setLastConnection(new Date().toLocaleString())
        } else {
          setStatus("DISCONNECTED")
        }
      } else {
        setStatus("DISCONNECTED")
      }
    } catch (error) {
      console.error("Error checking initial status:", error)
      setStatus("DISCONNECTED")
    } finally {
      setIsLoading(false)
    }
  }

  // Iniciar conexão e gerar QR code
  const startConnection = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para conectar o WhatsApp.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setQrCode(null)

      // Iniciar sessão via serviço
      const result = await whatsAppService.startSession(user.email)

      // O serviço já atualiza o status via callback
      setSessionName(whatsAppService.sessionName)

      if (result && result.success === false) {
        setError(result.error || "Falha ao iniciar sessão")
      }
    } catch (error) {
      console.error("Error starting WhatsApp connection:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido ao iniciar conexão")
      setStatus("ERROR")
    } finally {
      setIsLoading(false)
    }
  }

  // Obter screenshot para diagnóstico
  const getScreenshot = async () => {
    if (!sessionName) return

    try {
      const screenshot = await whatsAppService.getScreenshot()
      if (screenshot && screenshot.screenshot) {
        // Abrir em nova aba
        const win = window.open()
        if (win) {
          win.document.write(`
            <html>
              <head><title>WhatsApp Screenshot</title></head>
              <body style="margin: 0; display: flex; justify-content: center; background: #f0f0f0;">
                <img src="${screenshot.screenshot}" style="max-width: 100%; height: auto; border: 1px solid #ccc;" />
              </body>
            </html>
          `)
        }
      }
    } catch (error) {
      console.error("Error getting screenshot:", error)
      toast({
        title: "Erro",
        description: "Não foi possível obter a screenshot da sessão.",
        variant: "destructive",
      })
    }
  }

  // Encerrar sessão
  const stopConnection = async () => {
    try {
      setIsLoading(true)
      await whatsAppService.stopSession()
      setStatus("DISCONNECTED")
      setQrCode(null)
      setError(null)
      setSessionName(null)
      toast({
        title: "Sessão encerrada",
        description: "A conexão com o WhatsApp foi encerrada com sucesso.",
      })
    } catch (error) {
      console.error("Error stopping connection:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao encerrar a sessão.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Renderizar status badge
  const renderStatusBadge = () => {
    switch (status) {
      case "CONNECTED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <Check className="h-3.5 w-3.5 mr-1" />
            Conectado
          </Badge>
        )
      case "INITIALIZING":
      case "WAITING":
      case "QR_READY":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            Conectando
          </Badge>
        )
      case "ERROR":
      case "TIMEOUT":
      case "CONNECTION_ISSUE":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Erro
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <Info className="h-3.5 w-3.5 mr-1" />
            Desconectado
          </Badge>
        )
    }
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl">Conexão WhatsApp</CardTitle>
            <CardDescription>Conecte sua conta para enviar mensagens automáticas</CardDescription>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0">{renderStatusBadge()}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-lg bg-white min-h-[350px]">
          {/* Estado CONECTADO */}
          {status === "CONNECTED" && (
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                <Check className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-green-700 mb-2">CONECTADO</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">Sua conta do WhatsApp está conectada.</p>
              {sessionName && (
                <p className="text-xs sm:text-sm text-gray-500 mb-1">
                  Sessão ativa: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                </p>
              )}
              {lastConnection && (
                <p className="text-xs sm:text-sm text-gray-500 mb-4">Última conexão: {lastConnection}</p>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={getScreenshot} disabled={isLoading}>
                  Ver Screenshot
                </Button>
                <Button variant="destructive" size="sm" onClick={stopConnection} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </div>

              <Alert variant="default" className="mt-4 max-w-md bg-yellow-50 border-yellow-100">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800 text-sm">Desconexão</AlertTitle>
                <AlertDescription className="text-yellow-700 text-xs">
                  Para usar outra conta ou reconectar, primeiro desconecte este aparelho em: WhatsApp &gt; Configurações
                  &gt; Aparelhos Conectados. A seguir, clique em "Gerar QR Code".
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Estado CONECTANDO / AGUARDANDO SCAN */}
          {(status === "INITIALIZING" || status === "WAITING" || status === "QR_READY") && (
            <div className="flex flex-col items-center text-center">
              {qrCode ? (
                <>
                  <div className="mb-4 p-1 border bg-white shadow-md">
                    <img
                      src={qrCode || "/placeholder.svg"}
                      alt="QR Code WhatsApp"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                    />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">Escaneie o QR Code</h3>
                  <p className="text-gray-600 max-w-sm mb-3 text-xs sm:text-sm px-2">
                    WhatsApp &gt; Configurações &gt; Aparelhos Conectados &gt; Conectar um Aparelho.
                  </p>
                  {sessionName && (
                    <p className="text-xs sm:text-sm text-blue-600 mb-3">
                      Sessão: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                    </p>
                  )}
                  <div className="flex items-center text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 mb-4 text-xs sm:text-sm">
                    <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
                    <span>Aguardando leitura... (expira em ~2 min)</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={stopConnection}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Iniciando Conexão...</h3>
                  <p className="text-gray-600 text-sm">Aguarde um momento.</p>
                  {sessionName && (
                    <p className="text-xs sm:text-sm text-blue-600 mt-3">
                      Sessão: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Estado ERRO */}
          {(status === "ERROR" || status === "TIMEOUT" || status === "CONNECTION_ISSUE") && (
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-red-700 mb-2">Erro na Conexão</h3>
              <p className="text-gray-600 mb-4 max-w-md break-words text-xs sm:text-sm bg-red-50 p-3 border border-red-100 rounded">
                {error || "Ocorreu um erro desconhecido."}
              </p>
              <Button variant="default" onClick={startConnection} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Estado DESCONECTADO (Inicial) */}
          {status === "DISCONNECTED" && (
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-4">
                <Smartphone className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2">WhatsApp Desconectado</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-sm">
                Clique no botão abaixo para gerar um QR Code e conectar sua conta do WhatsApp.
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                onClick={startConnection}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
                {isLoading ? "Gerando..." : "Gerar QR Code"}
              </Button>
              {sessionName && <p className="text-xs text-gray-400 mt-4">(Sessão anterior registrada: {sessionName})</p>}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start pt-4 sm:pt-6 border-t bg-gray-50/50">
        <Alert variant="default" className="mb-4 bg-blue-50 border-blue-100 w-full">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 text-sm">Importante</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs">
            Mantenha seu celular conectado à internet para que a conexão permaneça ativa.
          </AlertDescription>
        </Alert>
        <div className="text-xs text-gray-500 px-1">
          <p>Utilize a API oficial ou APIs compatíveis. Siga as políticas de uso.</p>
        </div>
      </CardFooter>
    </Card>
  )
}
