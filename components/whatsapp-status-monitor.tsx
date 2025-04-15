"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { checkUserSession } from "@/lib/session-manager"
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
      const response = await fetch(`https://api.parabenspravoce.com/api/sessions/${sessionInfo.sessionName}/status`, {
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

  return null
}
