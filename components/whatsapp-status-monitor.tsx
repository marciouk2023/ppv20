"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { checkUserSession } from "@/lib/session-manager"
import { Loader2, AlertCircle, CheckCircle, RefreshCw, QrCode } from "lucide-react"
import { useRouter } from "next/navigation"

interface WhatsAppStatus {
  connected: boolean
  authenticated: boolean
  state?: string
  status?: string
  sessionName?: string
  lastChecked: Date
}

export function WhatsAppStatusMonitor() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Verificar status do WhatsApp
  const checkWhatsAppStatus = async () => {
    if (!user?.email) return

    try {
      setIsRefreshing(true)

      // Verificar se o usuário tem uma sessão
      const sessionInfo = await checkUserSession(user.email)

      if (!sessionInfo.hasSession || !sessionInfo.sessionName) {
        setStatus({
          connected: false,
          authenticated: false,
          state: "NOT_FOUND",
          status: "Nenhuma sessão encontrada",
          lastChecked: new Date(),
        })
        return
      }

      // Verificar status da sessão
      const response = await fetch(`/api/whatsapp/sessions/${sessionInfo.sessionName}/status`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`)
      }

      const data = await response.json()

      // Atualizar estado com o status
      setStatus({
        connected: data.connected || false,
        authenticated: data.authenticated || false,
        state: data.state || data.engine_state,
        status: data.status,
        sessionName: sessionInfo.sessionName,
        lastChecked: new Date(),
      })
    } catch (error) {
      console.error("Erro ao verificar status do WhatsApp:", error)
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status da conexão WhatsApp.",
        variant: "destructive",
      })
      setStatus({
        connected: false,
        authenticated: false,
        state: "ERROR",
        status: "Erro ao verificar status",
        lastChecked: new Date(),
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Verificar status ao montar o componente
  useEffect(() => {
    checkWhatsAppStatus()
  }, [user])

  // Navegar para a página de configurações
  const goToConfigPage = () => {
    router.push("/configuracoes")
  }

  // Formatar data
  const formatDateTime = (date: Date) => {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status da Conexão WhatsApp</CardTitle>
        <CardDescription>Monitore o status da sua conexão com o WhatsApp</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : status ? (
          <div className="space-y-4">
            {status.connected ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Conectado</AlertTitle>
                <AlertDescription className="text-green-700">
                  Sua conta do WhatsApp está conectada e pronta para uso.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Desconectado</AlertTitle>
                <AlertDescription>
                  Sua conta do WhatsApp não está conectada. Acesse a página de configurações para conectar.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <p className="font-medium">
                  {status.connected ? (
                    <span className="text-green-600">Conectado</span>
                  ) : (
                    <span className="text-red-600">Desconectado</span>
                  )}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Estado</h3>
                <p className="font-medium">{status.state || "Desconhecido"}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Sessão</h3>
                <p className="font-medium">{status.sessionName || "Nenhuma"}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Última verificação</h3>
                <p className="font-medium">{formatDateTime(status.lastChecked)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Não foi possível obter o status da conexão</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={checkWhatsAppStatus} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </>
          )}
        </Button>
        {!status?.connected && (
          <Button className="bg-green-500 hover:bg-green-600" onClick={goToConfigPage}>
            <QrCode className="h-4 w-4 mr-2" />
            Conectar WhatsApp
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
