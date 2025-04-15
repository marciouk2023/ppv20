// Caminho: app/configuracoes/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Clock, MessageSquare, Info, AlertTriangle, RefreshCw, Smartphone, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { saveUserSession, updateSessionStatus, checkUserSession } from "@/lib/session-manager"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { differenceInSeconds } from "date-fns"

// Types for connection status
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

// Global variable to store the status check interval
let statusCheckInterval: NodeJS.Timeout | null = null

// !!! ATENÇÃO: Chave da API - Mover para variável de ambiente em produção !!!
const WAHA_API_KEY = 'Cara2211Msa2013+ou-6';

// Connection Status Badge Component
function ConnectionStatusBadge({
  status,
  setConnectionStatus,
  setLastConnection,
}: {
  status: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void
  setLastConnection: (lastConnection: string | null) => void
}) {
  // State to store the actual WAHA session status
  const [wahaStatus, setWahaStatus] = useState<string | null>(null)
  const { user } = useAuth()

  // Effect to check the session status on the WAHA server
  useEffect(() => {
    const checkWahaStatus = async () => {
      if (!user?.email) return // Don't check if user is not logged in

      try {
        // Check if the user has a specific session registered in Firestore
        const userSession = await checkUserSession(user.email)
        if (userSession.hasSession && userSession.sessionName) {
          // If the user has a session, check the status of that specific session
          try {
            // Use VERCEL_URL if available, otherwise fallback
            const apiUrl = "/api" // Sempre use a API local, que fará o proxy corretamente

            // <<< MODIFICAÇÃO AQUI: Corrigido o path e adicionado o header >>>
            const sessionEndpoint = `${apiUrl}/api/sessions/${userSession.sessionName}` // REMOVIDO /status
            console.log(`[StatusBadge] Checking endpoint: ${sessionEndpoint}`) // Debug URL
            const response = await fetch(sessionEndpoint, {
              cache: "no-store", // Ensure fresh data
              headers: { // ADICIONADO header
                'X-API-KEY': WAHA_API_KEY
              }
            })
            // <<< FIM DA MODIFICAÇÃO >>>

            if (response.ok) {
              const data = await response.json()
              // console.log(`[StatusBadge] Status of session ${userSession.sessionName}:`, data) // Debug log
              const currentState = data.state || data.status // Handle potential variations in API response
              setWahaStatus(currentState)

              if (
                currentState === "WORKING" ||
                currentState === "CONNECTED" ||
                currentState === "AUTHENTICATED" || // Adicionado estado AUTHENTICATED como conectado
                data.connected === true || // Verificações redundantes podem ser úteis
                data.authenticated === true
              ) {
                if (status !== "connected") setConnectionStatus("connected") // Only update if changed
                // setLastConnection(new Date().toLocaleString()) // Maybe update less frequently
              } else if (currentState === "SCAN_QR_CODE" || currentState === "STARTING" || currentState === "PAIRING") {
                if (status === "disconnected") {
                  setConnectionStatus("connecting")
                }
                // Se já estiver 'connecting', não mudar para 'connecting' de novo
              } else {
                // Qualquer outro estado (OPENING, DISCONNECTED, etc.) considera desconectado
                if (status === "connected") {
                  setConnectionStatus("disconnected")
                }
              }
              return // Sai da função após sucesso
            } else {
              // Resposta não OK (ex: 401, 404, 500)
              console.warn(
                `[StatusBadge] Non-OK response (${response.status}) checking session ${userSession.sessionName}`,
              )
              if (status === "connected") setConnectionStatus("disconnected")
            }
          } catch (error) {
            // Erro na chamada fetch (rede, etc)
            console.warn(`[StatusBadge] Error fetching session status for ${userSession.sessionName}:`, error)
            if (status === "connected") setConnectionStatus("disconnected")
          }
        } else {
          // Firestore diz que não tem sessão
          if (status === "connected") setConnectionStatus("disconnected")
        }
      } catch (error) {
        // Erro ao checar checkUserSession
        console.warn("[StatusBadge] Error checking WAHA status (outer try):", error)
        if (status === "connected") setConnectionStatus("disconnected")
      }
    }

    // Check immediately and then every 15 seconds
    checkWahaStatus()
    const interval = setInterval(checkWahaStatus, 15000) // Check every 15 seconds

    return () => clearInterval(interval) // Cleanup interval on component unmount
  }, [user, status, setConnectionStatus, setLastConnection]) // Rerun if user, status, or setters change

  // Render badge based on the main connectionStatus prop
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <Check className="h-3.5 w-3.5 mr-1" />
          Conectado
        </Badge>
      )
    case "connecting":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          Conectando
        </Badge>
      )
    case "error":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Erro
        </Badge>
      )
    default: // disconnected
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          <Info className="h-3.5 w-3.5 mr-1" />
          Desconectado
        </Badge>
      )
  }
}

// --- Main Component ---
export default function ConfiguracoesPage() {
  // Component States
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastConnection, setLastConnection] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState("08:00") // Default send time
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const [wahaStatus, setWahaStatus] = useState<string | null>(null) // Estado interno para status da WAHA

  // State to store user session info fetched from Firestore/API
  const [userSessionInfo, setUserSessionInfo] = useState<{
    hasSession: boolean
    sessionName: string | null
    status: string | null // Status from Firestore
  }>({
    hasSession: false,
    sessionName: null,
    status: null,
  })

  // Save selected time to Firestore
  const saveTimeToFirestore = async (time: string) => {
    if (!user?.email) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" })
      return
    }
    try {
      const userSettingsRef = doc(db, "user_settings", user.email)
      await setDoc(userSettingsRef, { sendTime: time, updatedAt: new Date() }, { merge: true })
      console.log(`Horário ${time} salvo com sucesso para ${user.email}`)
      toast({ title: "Horário Salvo", description: `O horário de envio foi definido para ${time}.` })
    } catch (error) {
      console.error("Erro ao salvar horário no Firestore:", error)
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o horário.", variant: "destructive" })
    }
  }

  // Load saved time from Firestore
  useEffect(() => {
    const loadSavedTime = async () => {
      if (!user?.email) return
      try {
        const userSettingsRef = doc(db, "user_settings", user.email)
        const docSnap = await getDoc(userSettingsRef)
        if (docSnap.exists() && docSnap.data().sendTime) {
          const savedTime = docSnap.data().sendTime
          setHorarioSelecionado(savedTime)
          // console.log(`Horário carregado do Firestore: ${savedTime}`)
        } else {
          // console.log("Nenhum horário salvo encontrado, usando padrão 08:00.")
          setHorarioSelecionado("08:00") // Define padrão se não houver salvo
        }
      } catch (error) {
        console.error("Erro ao carregar horário do Firestore:", error)
      }
    }
    loadSavedTime()
  }, [user])

  // Check and update connection status (Function used for periodic checks)
  const checkAndUpdateSessionStatus = async () => {
    if (!user?.email) {
      // If user logs out, ensure disconnected status
      if (connectionStatus !== "disconnected") {
        setConnectionStatus("disconnected")
      }
      setUserSessionInfo({ hasSession: false, sessionName: null, status: null })
      setSessionName(null) // Clear session name as well
      return
    }

    try {
      // 1. Check Firestore first
      const sessionInfo = await checkUserSession(user.email)
      setUserSessionInfo(sessionInfo) // Update state with Firestore info

      if (sessionInfo.hasSession && sessionInfo.sessionName) {
        setSessionName(sessionInfo.sessionName) // Keep track of the session name

        // 2. If Firestore indicates a potentially active session, check WAHA API
        // Only check API if status is potentially active or unknown
        // Avoid API check if Firestore clearly says 'disconnected' or 'error'
        if (
          sessionInfo.status === "WORKING" ||
          sessionInfo.status === "CONNECTED" ||
          sessionInfo.status === "AUTHENTICATED" ||
          sessionInfo.status === "STARTING" ||
          sessionInfo.status === "SCAN_QR_CODE" ||
          sessionInfo.status === "PAIRING" ||
          !sessionInfo.status // Also check if status is unknown/null in Firestore
        ) {
          try {
            const apiUrl = "/api" // Use local proxy

            // <<< MODIFICAÇÃO AQUI: Corrigido o path e adicionado o header >>>
            const statusEndpoint = `${apiUrl}/api/sessions/${sessionInfo.sessionName}` // REMOVIDO /status
            console.log(`[SessionCheck] Checking API endpoint: ${statusEndpoint}`)
            const response = await fetch(statusEndpoint, {
                cache: "no-store",
                headers: { // ADICIONADO header
                    'X-API-KEY': WAHA_API_KEY
                }
             })
            // <<< FIM DA MODIFICAÇÃO >>>

            if (response.ok) {
              const data = await response.json()
              const currentState = data.state || data.status // Get WAHA status
              setWahaStatus(currentState) // Update WAHA status state

              // Update main connectionStatus based on WAHA API response
              if (
                currentState === "WORKING" ||
                currentState === "CONNECTED" ||
                currentState === "AUTHENTICATED" ||
                data.connected === true ||
                data.authenticated === true
              ) {
                if (connectionStatus !== "connected") setConnectionStatus("connected")
              } else if (currentState === "SCAN_QR_CODE" || currentState === "STARTING" || currentState === "PAIRING") {
                if (connectionStatus === "disconnected") setConnectionStatus("connecting")
                // Se já está 'connecting', não faz nada
              } else {
                // Assume disconnected for other states (OPENING, DISCONNECTED, etc.)
                if (connectionStatus === "connected") setConnectionStatus("disconnected")
              }
            } else {
              // API returned non-OK status
              console.warn(
                `[SessionCheck] Non-OK response (${response.status}) from API for ${sessionInfo.sessionName}`,
              )
              // If we thought we were connected, but API check fails, set to disconnected
              if (connectionStatus === "connected") setConnectionStatus("disconnected")
            }
          } catch (apiError) {
            // Error fetching from API
            console.error(`[SessionCheck] Error fetching API status for ${sessionInfo.sessionName}:`, apiError)
            if (connectionStatus === "connected") setConnectionStatus("disconnected")
          }
        } else {
          // Firestore status is explicitly not active (e.g., 'disconnected', 'error')
          // Ensure frontend reflects this disconnected state
          if (connectionStatus !== "disconnected") {
            setConnectionStatus("disconnected")
          }
        }
      } else {
        // Firestore says no session exists for the user
        if (connectionStatus !== "disconnected") {
          setConnectionStatus("disconnected")
        }
        setSessionName(null) // Clear session name if no session exists
      }
    } catch (error) {
      // Error during checkUserSession (Firestore read error)
      console.error("[SessionCheck] Error checking user session (Firestore):", error)
      if (connectionStatus !== "disconnected") {
        setConnectionStatus("disconnected")
      }
      // Reset states on error
      setUserSessionInfo({ hasSession: false, sessionName: null, status: null })
      setSessionName(null)
    }
  }


  // Run session check periodically and on user change
  useEffect(() => {
    if (!user?.email) {
      setConnectionStatus("disconnected") // Force disconnect if user logs out
      return // Stop if no user
    }
    checkAndUpdateSessionStatus() // Initial check when user loads or changes
    const intervalId = setInterval(checkAndUpdateSessionStatus, 20000) // Check every 20 seconds
    return () => clearInterval(intervalId) // Cleanup interval on unmount or user change
  }, [user]) // Re-run when user object changes

  // Cleanup status check interval when component unmounts
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        // console.log("[Frontend] Cleaning up WAHA status check interval on unmount.");
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    }
  }, []) // Run only once on mount for cleanup registration


  // Helper function to generate a unique session name (REMOVED prefix 'session_')
  function generateLocalUniqueSessionName(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    return `${timestamp}_${random}` // Sem prefixo
  }


  // Generate QR Code
  const generateQRCode = async () => {
    if (!user?.email) {
      toast({ title: "Erro", description: "Faça login para conectar.", variant: "destructive" })
      return
    }

    // Gere um nome de sessão localmente (sem prefixo)
    // Usamos um nome novo toda vez para garantir que um QR novo seja gerado
    const tempSessionName = generateLocalUniqueSessionName();
    console.log(`[Frontend] generateQRCode - Using new session name: ${tempSessionName}`)

    // Stop any existing status check interval related to a previous QR attempt
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }

    setIsGeneratingQR(true)
    setErrorMessage(null)
    setConnectionStatus("connecting") // Show connecting state immediately
    setQrCode(null) // Clear previous QR code
    setSessionName(tempSessionName) // Set the session name we are trying to initiate

    try {
      const apiUrl = "/api" // Use local proxy

      // Call backend API to start session and get QR
      // <<< MODIFICAÇÃO AQUI: NÃO adicionamos X-API-KEY aqui intencionalmente >>>
      // Assumimos que a rota /api/whatsapp/generate-qr no backend é responsável
      // por se autenticar com a WAHA API se necessário. O frontend só envia
      // os dados para iniciar o processo.
      const startSessionResponse = await fetch(`${apiUrl}/api/whatsapp/generate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: tempSessionName, // Envia nome sem prefixo
          userEmail: user.email,
        }),
        cache: "no-store", // Evita cache
      })
      // <<< FIM DA MODIFICAÇÃO >>>


      const startSessionData = await startSessionResponse.json()

      if (!startSessionResponse.ok) {
        console.error(`[Frontend] Error from API generating QR (${startSessionResponse.status}):`, startSessionData)
        throw new Error(startSessionData.message || `Falha ao gerar QR Code: Status ${startSessionResponse.status}`)
      }

      // Successfully initiated on the backend, save association in Firestore
      await saveUserSession(user.email, tempSessionName) // Salva nome sem prefixo

      // Check response for QR code or already connected status
      if (startSessionData.qrCode) {
        // console.log("[Frontend] QR Code received directly. Displaying.");
        setQrCode(startSessionData.qrCode)
        setConnectionStatus("connecting") // Keep connecting state while QR is displayed
        startStatusChecking(tempSessionName) // Start polling for connection confirmation
      } else if (
        startSessionData.status === "CONNECTED" ||
        startSessionData.status === "WORKING" ||
        startSessionData.status === "AUTHENTICATED"
      ) {
        // console.log("[Frontend] API reported session already connected during QR request.");
        setConnectionStatus("connected") // Go directly to connected state
        setQrCode(null) // Ensure no QR code is shown
        setLastConnection(new Date().toLocaleString())
        await updateSessionStatus(user.email, "CONNECTED") // Update Firestore status
      } else {
        // Fallback: Start polling if QR wasn't returned and not already connected
        console.warn(
          "[Frontend] QR not returned and not connected, starting polling based on session status:",
          startSessionData.status,
        )
        setConnectionStatus("connecting") // Assume connecting and poll
        startStatusChecking(tempSessionName)
      }
    } catch (error) {
      console.error("[Frontend] GENERAL ERROR in generateQRCode flow:", error)
      setConnectionStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido ao gerar QR Code.")
      setQrCode(null)
      // Do not clear sessionName here, might be needed for retry if session exists
      // Ensure interval is cleared on error
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    } finally {
      setIsGeneratingQR(false) // Stop loading indicator for the button
    }
  }


  // Start Periodic Status Checking After QR Display
  const startStatusChecking = (sessionNameToCheck: string) => {
    // Clear any previous interval first
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }

    // console.log(`[StatusCheck] Starting for ${sessionNameToCheck} (Interval: 5s, Timeout: 2min)`)
    let attemptCount = 0
    const maxAttempts = 24 // 2 minutes timeout (24 * 5 seconds)

    statusCheckInterval = setInterval(async () => {
      // Stop conditions
      if (
        attemptCount >= maxAttempts || // Timeout reached
        connectionStatus === "connected" || // Already connected
        connectionStatus === "error" || // An error occurred
        sessionName !== sessionNameToCheck // User initiated a new QR generation
      ) {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval)
          statusCheckInterval = null
          // console.log(`[StatusCheck] Stopped for ${sessionNameToCheck}. Reason: Attempts=${attemptCount}, Status=${connectionStatus}, SessionChanged=${sessionName !== sessionNameToCheck}.`)
          // Handle timeout specifically
          if (attemptCount >= maxAttempts && connectionStatus === "connecting" && sessionName === sessionNameToCheck) {
            setConnectionStatus("error")
            setQrCode(null) // Clear QR code on timeout
            setErrorMessage("Tempo expirado para escanear o QR Code. Gere um novo.")
            // Consider logging out the session on the backend if possible on timeout
          }
        }
        return // Exit the interval function
      }

      attemptCount++

      try {
        const apiUrl = "/api" // Use local proxy

        // Ensure we use the correct session name for checking (without prefix if needed)
        const wahaSessionName = sessionNameToCheck // Já estamos usando sem prefixo

        // <<< MODIFICAÇÃO AQUI: Corrigido o path e adicionado o header >>>
        const statusEndpoint = `${apiUrl}/api/sessions/${wahaSessionName}` // REMOVIDO /status
        console.log(`[StatusCheck] Checking endpoint: ${statusEndpoint}`)
        const statusResponse = await fetch(statusEndpoint, {
            cache: "no-store",
            headers: { // ADICIONADO header
                'X-API-KEY': WAHA_API_KEY
            }
        })
        // <<< FIM DA MODIFICAÇÃO >>>


        // Handle non-JSON responses gracefully
        const contentType = statusResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await statusResponse.text()
          // console.warn(`[StatusCheck] Non-JSON response (${statusResponse.status}). Body: ${responseText.substring(0,100)}`);
          if (statusResponse.status === 404) {
             // If API says session not found during polling, it's an error state
            setErrorMessage(`Sessão ${sessionNameToCheck} não encontrada na API. Gere um novo QR code.`)
            setConnectionStatus("error")
            setQrCode(null)
            if (statusCheckInterval) clearInterval(statusCheckInterval)
            statusCheckInterval = null
          }
          // If not 404, maybe just transient issue, continue polling? Or treat as error?
          // For now, just log and let it continue polling unless 404.
          return // Skip processing this interval
        }

        // Process JSON response
        const statusResult = await statusResponse.json()
        // console.log(`[StatusCheck] <- Response ${statusResponse.status}:`, statusResult);

        if (!statusResponse.ok) {
          // Handle non-OK JSON responses (e.g., 401 Unauthorized, 422)
          // console.warn(`[StatusCheck] Non-OK status (${statusResponse.status}) from API:`, statusResult.message || statusResult);
          // Potentially set error state here if needed based on status code
          return // Continue polling unless it's a fatal error
        }

        // Check WAHA status from the successful response
        const currentState = statusResult.state || statusResult.status
        if (
          currentState === "CONNECTED" ||
          currentState === "WORKING" ||
          currentState === "AUTHENTICATED" ||
          statusResult.connected === true || // Redundant checks
          statusResult.authenticated === true
        ) {
          // console.log("[StatusCheck] CONNECTED!")
          setConnectionStatus("connected") // Set final connected state
          setQrCode(null) // Clear QR code
          setLastConnection(new Date().toLocaleString()) // Record connection time
          if (user?.email) {
            await updateSessionStatus(user.email, "CONNECTED") // Update Firestore
          }
          if (statusCheckInterval) clearInterval(statusCheckInterval) // Stop polling immediately
          statusCheckInterval = null
        } else {
          // Still waiting (e.g., SCAN_QR_CODE, STARTING) - continue polling
          // console.log(`[StatusCheck] Current status: ${currentState || "Unknown"}`)
        }
      } catch (error) {
        // Network error during fetch
        console.error(`[StatusCheck] Network/Fetch error checking status for ${sessionNameToCheck}:`, error)
        // Perhaps implement retry logic or stop after several network errors?
        // For now, let it continue polling.
      }
    }, 5000) // Check every 5 seconds
  }


  // --- Render Component ---
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      <Sidebar activePage="configuracoes" />
      <div className="flex-1 p-6 ml-0 md:ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Configurações</h1>
          <p className="text-gray-600 mb-6">Gerencie as configurações do sistema e conexões</p>

          <div className="space-y-6">
            {/* WhatsApp Connection Card */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">Conexão WhatsApp</CardTitle>
                    <CardDescription>Conecte sua conta para enviar mensagens automáticas</CardDescription>
                  </div>
                  <div className="flex-shrink-0 mt-2 sm:mt-0">
                    {/* ConnectionStatusBadge now relies on the main component's periodic check */}
                    <ConnectionStatusBadge
                      status={connectionStatus}
                      setConnectionStatus={setConnectionStatus} // Pass setter if needed by badge internally (seems not needed now)
                      setLastConnection={setLastConnection}   // Pass setter if needed by badge internally (seems not needed now)
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-lg bg-white min-h-[350px]">
                  {/* --- CONNECTED State --- */}
                  {connectionStatus === "connected" && (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                        <Check className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-medium text-green-700 mb-2">CONECTADO</h3>
                      <p className="text-gray-600 mb-4 text-sm sm:text-base">Sua conta do WhatsApp está conectada.</p>
                      {sessionName && (
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">
                          Sessão ativa:{" "}
                          <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                        </p>
                      )}
                      {lastConnection && (
                        <p className="text-xs sm:text-sm text-gray-500 mb-4">Última conexão: {lastConnection}</p>
                      )}
                      {/* Session info box */}
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md w-full max-w-md">
                        <p className="text-sm text-blue-700 font-medium mb-1 flex items-center">
                          <Info className="h-4 w-4 mr-1.5 text-blue-500 flex-shrink-0" />
                          Informações da Sessão
                        </p>
                        {user?.email && <p className="text-xs text-blue-600 break-words">Associada a: {user.email}</p>}
                        {/* Removed session name display from here as it's shown above */}
                         {wahaStatus && ( // Display WAHA status if available
                            <p className="text-xs text-blue-600 mt-1">Status WAHA: <span className="font-semibold">{wahaStatus}</span></p>
                         )}
                      </div>
                      <Alert variant="default" className="mt-4 max-w-md bg-yellow-50 border-yellow-100">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800 text-sm">Desconexão</AlertTitle>
                        <AlertDescription className="text-yellow-700 text-xs">
                          Para usar outra conta ou reconectar, primeiro desconecte este aparelho em: WhatsApp &gt;
                          Configurações &gt; Aparelhos Conectados. A seguir, clique em "Gerar Novo QR Code".
                        </AlertDescription>
                      </Alert>
                      {/* Re-enable QR generation button */}
                      <Button
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                        onClick={generateQRCode}
                        disabled={isGeneratingQR}
                        size="lg"
                      >
                        {isGeneratingQR ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-5 w-5 mr-2" />
                        )}
                        {isGeneratingQR ? "Gerando..." : "Gerar Novo QR Code"}
                      </Button>
                    </div>
                  )}

                  {/* --- CONNECTING / WAITING FOR SCAN State --- */}
                  {connectionStatus === "connecting" && (
                    <div className="flex flex-col items-center text-center">
                      {qrCode ? (
                        <>
                          <div className="mb-4 p-1 border bg-white shadow-md">
                            <img
                              src={qrCode || "/placeholder.svg"} // Use placeholder if qrCode is null somehow
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
                              Sessão:{" "}
                              <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
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
                            onClick={() => {
                              setConnectionStatus("disconnected") // Go back to disconnected
                              setQrCode(null) // Clear QR
                              setErrorMessage(null) // Clear error
                              // Do not clear sessionName, might be needed for backend cleanup if applicable
                              if (statusCheckInterval) clearInterval(statusCheckInterval) // Stop polling
                              statusCheckInterval = null
                              console.log("QR Scan Cancelled by user.")
                              // Optionally call a backend endpoint to stop/logout the session if needed
                            }}
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
                              Sessão:{" "}
                              <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* --- ERROR State --- */}
                  {connectionStatus === "error" && (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                        <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-medium text-red-700 mb-2">Erro na Conexão</h3>
                      <p className="text-gray-600 mb-4 max-w-md break-words text-xs sm:text-sm bg-red-50 p-3 border border-red-100 rounded">
                        {errorMessage || "Ocorreu um erro desconhecido."}
                      </p>
                      <Button variant="default" onClick={generateQRCode} disabled={isGeneratingQR}>
                        {isGeneratingQR ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Tentar Novamente
                      </Button>
                    </div>
                  )}

                  {/* --- DISCONNECTED (Initial) State --- */}
                  {connectionStatus === "disconnected" && (
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
                        onClick={generateQRCode}
                        disabled={isGeneratingQR}
                        size="lg"
                      >
                        {isGeneratingQR ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-5 w-5 mr-2" />
                        )}
                        {isGeneratingQR ? "Gerando..." : "Gerar QR Code"}
                      </Button>
                      {userSessionInfo.hasSession && userSessionInfo.sessionName && (
                        <p className="text-xs text-gray-400 mt-4">
                          (Sessão anterior registrada: {userSessionInfo.sessionName})
                        </p>
                      )}
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

            {/* --- General Configuration Section --- */}
            <div className="mt-6">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl">Configurações Gerais</CardTitle>
                  <CardDescription>Ajuste o horário de envio e personalização</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Send Time Setting */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h3 className="font-medium text-base sm:text-lg">Horário Padrão de Envio</h3>
                      </div>
                      <div className="bg-green-50/60 p-4 rounded-lg border border-green-100">
                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
                          <Label htmlFor="hora" className="text-sm text-green-800 text-center sm:text-left">
                            Horário para envio automático:
                          </Label>
                          <Input
                            id="hora"
                            type="time"
                            value={horarioSelecionado}
                            className="text-center text-lg font-medium w-32 bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                            onChange={(e) => {
                              const newTime = e.target.value
                              if (newTime) {
                                setHorarioSelecionado(newTime)
                                // Removed direct save, using modal
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setShowConfirmModal(true)}
                          >
                            Salvar Horário
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center sm:text-left pl-1">
                          Horário de Brasília (GMT-3)
                        </p>
                         {/* Countdown Timer Component (Display Only) */}
                         <CountdownTimer targetTime={horarioSelecionado} />
                      </div>
                    </div>
                    {/* Message Personalization Setting */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-medium text-base sm:text-lg">Personalização de Mensagens</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3 p-3 bg-indigo-50/50 rounded-md border border-indigo-100">
                          <Switch id="use-name" disabled={true} checked={true} /> {/* Always enabled */}
                          <div className="flex-1">
                            <Label htmlFor="use-name" className="font-medium text-sm sm:text-base text-indigo-900">
                              Incluir nome do contato automaticamente
                            </Label>
                            <p className="text-xs sm:text-sm text-indigo-700 mt-1">
                              A tag{" "}
                              <code className="text-xs bg-indigo-100 px-1 py-0.5 rounded font-mono">{`{nome}`}</code>{" "}
                              será sempre substituída pelo primeiro nome do contato.
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                          <h4 className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wider">Exemplo</h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500">Mensagem configurada:</p>
                              <p className="text-sm bg-white p-2 rounded border border-dashed">
                                Feliz aniversário,{" "}
                                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">{`{nome}`}</code>!
                                Que Deus abençoe sua vida.
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Mensagem enviada para "Maria Silva":</p>
                              <p className="text-sm bg-white p-2 rounded border">
                                Feliz aniversário, <span className="font-medium text-green-600">Maria</span>! Que Deus
                                abençoe sua vida.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Time Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto shadow-xl">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-10 w-10 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-3">Confirmar Horário de Envio</h3>
              <p className="mb-6 text-sm text-gray-700">
                Deseja definir <span className="font-bold text-green-600">{horarioSelecionado}</span> como o horário
                padrão para o envio automático de mensagens de aniversário pelo sistema?
              </p>
              <div className="flex gap-3 w-full justify-center">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={() => {
                    setShowConfirmModal(false)
                    saveTimeToFirestore(horarioSelecionado) // Save the confirmed time
                  }}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// --- Countdown Timer Component (Display Only - Logic Removed) ---
function CountdownTimer({ targetTime }: { targetTime: string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("Calculando...")
  const [isNear, setIsNear] = useState(false) // Only show if target is within 24 hours

  useEffect(() => {
    const calculateTime = () => {
      try {
        const now = new Date()
        const [targetHours, targetMinutes] = targetTime.split(":").map(Number)

        if (isNaN(targetHours) || isNaN(targetMinutes)) {
          throw new Error("Invalid target time format")
        }

        // Calculate target time based on current date and target HH:MM
        const targetDate = new Date(now) // Use current date
        targetDate.setHours(targetHours, targetMinutes, 0, 0)

        // If target time has already passed today, set target for tomorrow
        if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1)
        }

        // Calculate difference in seconds
        const diffInSeconds = differenceInSeconds(targetDate, now)

        if (diffInSeconds >= 0 && diffInSeconds <= 86400) { // Only display if within the next 24 hours
          const hours = Math.floor(diffInSeconds / 3600)
          const minutes = Math.floor((diffInSeconds % 3600) / 60)
          const seconds = diffInSeconds % 60
          setTimeRemaining(
            `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          )
          setIsNear(true)
        } else {
          // If more than 24 hours away, don't show countdown
          setTimeRemaining("...")
          setIsNear(false)
        }
      } catch (error) {
        console.error("Error calculating time remaining for display:", error)
        setTimeRemaining("Erro")
        setIsNear(false)
      }
    }

    calculateTime() // Initial calculation
    const interval = setInterval(calculateTime, 1000) // Update every second
    return () => clearInterval(interval) // Cleanup on unmount or targetTime change
  }, [targetTime]) // Recalculate if targetTime changes

  if (!isNear) return null // Don't render if target is far away

  return (
    <div className="mt-4 text-center">
      <p className="text-xs font-medium text-gray-600 mb-1">Próximo envio (via servidor) em:</p>
      <div className="bg-white px-3 py-1.5 rounded-md border border-green-200 inline-block">
        <span className="font-mono text-base sm:text-lg font-semibold text-green-700">{timeRemaining}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1.5 px-2">O sistema verificará no servidor neste horário.</p>
    </div>
  )
}
