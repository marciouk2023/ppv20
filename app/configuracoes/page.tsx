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
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { differenceInSeconds } from "date-fns"

// Types for connection status
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

// Global variable to store the status check interval
let statusCheckInterval: NodeJS.Timeout | null = null

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
  const isAdmin = user?.email === "ronaldo@graficaeleal.com.br" // Example admin email

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
            const sessionEndpoint = `/api/sessions/${userSession.sessionName}/status`
            const response = await fetch(sessionEndpoint, {
              cache: "no-store", // Ensure fresh data
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`[StatusBadge] Status of session ${userSession.sessionName}:`, data)
              const currentState = data.state || data.status // Handle potential variations in API response
              setWahaStatus(currentState)

              // If the status indicates it's connected, update the main state
              if (
                currentState === "WORKING" ||
                currentState === "CONNECTED" ||
                currentState === "AUTHENTICATED" ||
                data.connected === true || // Fallback checks
                data.authenticated === true
              ) {
                setConnectionStatus("connected")
                setLastConnection(new Date().toLocaleString())
              } else if (currentState === "SCAN_QR_CODE" || currentState === "STARTING" || currentState === "PAIRING") {
                // If waiting for QR scan or starting, reflect that if the main status is disconnected
                if (status === "disconnected") {
                  setConnectionStatus("connecting") // Show connecting state if QR is needed
                }
              } else {
                // If status is something else (like 'DISCONNECTED', 'error', etc.) and the main status is 'connected', update it
                if (status === "connected") {
                  setConnectionStatus("disconnected")
                }
              }
              return // Exit the function if found and processed a valid session
            } else {
              // Handle cases where the API returns an error for the specific session
              console.warn(
                `[StatusBadge] Non-OK response (${response.status}) checking session ${userSession.sessionName}`,
              )
              // Optionally set an error state or revert to disconnected if appropriate
              if (status === "connected") setConnectionStatus("disconnected")
            }
          } catch (error) {
            console.warn(`[StatusBadge] Error fetching session status for ${userSession.sessionName}:`, error)
            // Handle fetch error, maybe revert status
            if (status === "connected") setConnectionStatus("disconnected")
          }
        } else {
          // User has no session registered, ensure status reflects disconnected if currently connected
          if (status === "connected") setConnectionStatus("disconnected")
        }
      } catch (error) {
        console.warn("[StatusBadge] Error checking WAHA status (outer try):", error)
        if (status === "connected") setConnectionStatus("disconnected")
      }
    }

    // Check immediately and then every 15 seconds
    checkWahaStatus()
    const interval = setInterval(checkWahaStatus, 15000) // Check every 15 seconds

    return () => clearInterval(interval) // Cleanup interval on component unmount
  }, [user, status, setConnectionStatus, setLastConnection]) // Rerun if user, status, or setters change

  // Render badge based on the main connectionStatus prop first,
  // but allow wahaStatus check to override if it detects a connected state
  let displayStatus = status
  if (wahaStatus === "WORKING" || wahaStatus === "CONNECTED" || wahaStatus === "AUTHENTICATED") {
    displayStatus = "connected"
  }

  switch (displayStatus) {
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

// Main component
export default function ConfiguracoesPage() {
  // Component States
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastConnection, setLastConnection] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(null) // Stores the name of the session being worked with
  const [usePersonalizedName, setUsePersonalizedName] = useState(true) // For message personalization toggle
  const [horarioSelecionado, setHorarioSelecionado] = useState("08:00") // Default send time
  const [showConfirmModal, setShowConfirmModal] = useState(false) // Time change confirmation modal
  const { toast } = useToast() // Toast notifications
  const { user } = useAuth() // Authentication context
  const isAdmin = user?.email === "ronaldo@graficaeleal.com.br" // Example admin email

  // State to store user session info fetched from Firestore/API
  const [userSessionInfo, setUserSessionInfo] = useState<{
    hasSession: boolean
    sessionName: string | null
    status: string | null
  }>({
    hasSession: false,
    sessionName: null,
    status: null,
  })

  // Save selected time to Firestore
  const saveTimeToFirestore = async (time: string) => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      })
      return
    }

    try {
      const userSettingsRef = doc(db, "user_settings", user.email)
      await setDoc(
        userSettingsRef,
        {
          sendTime: time,
          updatedAt: new Date(),
        },
        { merge: true }, // Use merge: true to create or update
      )
      console.log(`Horário ${time} salvo com sucesso para ${user.email}`)
      toast({
        title: "Horário Salvo",
        description: `O horário de envio foi definido para ${time}.`,
      })
    } catch (error) {
      console.error("Erro ao salvar horário no Firestore:", error)
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar o horário. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Load saved time from Firestore on component mount or user change
  useEffect(() => {
    const loadSavedTime = async () => {
      if (!user?.email) return

      try {
        const userSettingsRef = doc(db, "user_settings", user.email)
        const docSnap = await getDoc(userSettingsRef)

        if (docSnap.exists() && docSnap.data().sendTime) {
          const savedTime = docSnap.data().sendTime
          setHorarioSelecionado(savedTime)
          console.log(`Horário carregado do Firestore: ${savedTime}`)
        } else {
          console.log("Nenhum horário salvo encontrado, usando padrão 08:00.")
          setHorarioSelecionado("08:00") // Reset to default if not found
        }
      } catch (error) {
        console.error("Erro ao carregar horário do Firestore:", error)
        // Optionally show a toast error
      }
    }

    loadSavedTime()
  }, [user]) // Dependency: user

  // Check and update connection status based on user session info
  const checkAndUpdateSessionStatus = async () => {
    if (!user?.email) {
      setConnectionStatus("disconnected") // Ensure disconnected if no user
      setUserSessionInfo({ hasSession: false, sessionName: null, status: null })
      return
    }

    try {
      const sessionInfo = await checkUserSession(user.email)
      setUserSessionInfo(sessionInfo) // Update state with fetched info

      if (
        sessionInfo.hasSession &&
        sessionInfo.sessionName &&
        (sessionInfo.status === "WORKING" ||
          sessionInfo.status === "CONNECTED" ||
          sessionInfo.status === "AUTHENTICATED")
      ) {
        // If Firestore indicates an active session, verify with the API
        try {
          const response = await fetch(`/api/sessions/${sessionInfo.sessionName}/status`, {
            cache: "no-store",
          })
          if (response.ok) {
            const data = await response.json()
            const currentState = data.state || data.status
            if (
              currentState === "WORKING" ||
              currentState === "CONNECTED" ||
              currentState === "AUTHENTICATED" ||
              data.connected === true ||
              data.authenticated === true
            ) {
              if (connectionStatus !== "connected") {
                console.log(`[SessionCheck] Updating status to connected for session ${sessionInfo.sessionName}`)
                setConnectionStatus("connected")
                setSessionName(sessionInfo.sessionName) // Set the active session name
                setLastConnection(new Date().toLocaleString())
                setQrCode(null) // Clear any old QR code
                setErrorMessage(null) // Clear any old error
              }
            } else {
              // API says not connected, even if Firestore thought it was
              if (connectionStatus === "connected") {
                console.log(
                  `[SessionCheck] API shows session ${sessionInfo.sessionName} not connected (${currentState}). Updating status.`,
                )
                setConnectionStatus("disconnected")
              }
            }
          } else {
            // API error checking status
            if (connectionStatus === "connected") {
              console.warn(
                `[SessionCheck] API error (${response.status}) checking session ${sessionInfo.sessionName}. Assuming disconnected.`,
              )
              setConnectionStatus("disconnected")
            }
          }
        } catch (apiError) {
          console.error(`[SessionCheck] Error calling API for session ${sessionInfo.sessionName}:`, apiError)
          if (connectionStatus === "connected") {
            setConnectionStatus("disconnected") // Assume disconnected on API error
          }
        }
      } else {
        // Firestore says no active session or status isn't connected
        if (connectionStatus === "connected") {
          console.log("[SessionCheck] Firestore indicates no active session. Updating status to disconnected.")
          setConnectionStatus("disconnected")
          setSessionName(null) // Clear session name
        }
      }
    } catch (error) {
      console.error("[SessionCheck] Error checking user session:", error)
      if (connectionStatus === "connected") {
        setConnectionStatus("disconnected") // Assume disconnected if error fetching session info
      }
      setUserSessionInfo({ hasSession: false, sessionName: null, status: null }) // Reset on error
    }
  }

  // Run session check periodically and on user change
  useEffect(() => {
    checkAndUpdateSessionStatus() // Initial check
    const interval = setInterval(checkAndUpdateSessionStatus, 20000) // Check every 20 seconds

    return () => clearInterval(interval) // Cleanup interval
  }, [user]) // Re-run when user changes

  // Cleanup status check interval when component unmounts
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        console.log("[Frontend] Cleaning up status check interval on unmount.")
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    }
  }, []) // Run only once on mount for cleanup registration

  // Helper function to generate a unique session name (client-side)
  function generateLocalUniqueSessionName(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    const name = `session_${timestamp}_${random}`
    console.log(`[Frontend] Generated new local session name: ${name}`)
    return name
  }

  // --- MAIN FUNCTION: Generate QR Code ---
  const generateQRCode = async () => {
    if (!user?.email) {
      toast({ title: "Erro", description: "Faça login para conectar.", variant: "destructive" })
      return
    }

    let tempSessionName: string | null = null // Temporary name for this attempt

    // --- Stop any existing status check ---
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
      console.log("[Frontend] Cleared existing status check interval.")
    }

    // --- 1. Prepare UI State ---
    setIsGeneratingQR(true)
    setErrorMessage(null)
    setConnectionStatus("connecting")
    setQrCode(null)
    setSessionName(null) // Clear previous session name initially

    try {
      // --- 2. Generate Name & Call API to Start Session ---
      tempSessionName = generateLocalUniqueSessionName()
      setSessionName(tempSessionName) // Update UI state with the new name
      console.log(`[Frontend] Starting QR flow for session: ${tempSessionName}`)

      console.log(`[Frontend] -> Calling Local API: POST /api/sessions`)
      const createResponse = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: tempSessionName,
          userEmail: user.email, // Associate session with user
        }),
        cache: "no-store", // Don't cache this request
      })

      const createData = await createResponse.json()

      if (!createResponse.ok) {
        console.error(`[Frontend] Error from Local API creating session (${createResponse.status}):`, createData)
        // Try to provide a more specific error message
        let specificError = `Falha ao iniciar sessão: Status ${createResponse.status}`
        if (createData.message) {
          specificError = createData.message
        } else if (createResponse.status === 409) {
          specificError = "Conflito: A sessão já pode existir ou estar em um estado inválido."
        }
        throw new Error(specificError)
      }

      console.log(`[Frontend] <- Response from Local API (Create Session): ${createResponse.status}`, createData)

      // Session creation initiated, save association in Firestore
      await saveUserSession(user.email, tempSessionName)

      // --- 3. (Optional) Screenshot - Attempt but don't fail the flow if it errors ---
      try {
        console.log(`[Frontend] -> Calling Local API: GET /api/sessions/${tempSessionName}/screenshot`)
        const screenshotResponse = await fetch(`/api/sessions/${tempSessionName}/screenshot`, {
          cache: "no-store",
        })
        if (!screenshotResponse.ok) {
          console.warn(`[Frontend] Warning: Screenshot failed (${screenshotResponse.status}), continuing...`)
        } else {
          console.log(`[Frontend] <- Screenshot obtained successfully (or initiated).`)
        }
      } catch (screenshotError) {
        console.warn(`[Frontend] Warning: Error getting screenshot, continuing...:`, screenshotError)
      }

      // --- 4. Add Delay - Allow server time to generate QR ---
      console.log("[Frontend] Waiting 5 seconds before requesting QR Code...")
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Reduced delay to 5 seconds

      // --- 5. Fetch QR Code ---
      console.log(`[Frontend] -> Calling Local API: GET /api/sessions/${tempSessionName}/qrcode`)
      const qrResponse = await fetch(`/api/sessions/${tempSessionName}/qrcode`, { cache: "no-store" })

      // Check if the response is JSON before parsing
      const contentType = qrResponse.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await qrResponse.text() // Get text for debugging
        console.error(
          `[Frontend] Unexpected QR response type: ${contentType}. Status: ${qrResponse.status}. Body: ${responseText.substring(0, 200)}...`,
        )
        // Check for common HTML errors indicating gateway issues or server problems
        if (qrResponse.status >= 500 || responseText.toLowerCase().includes("<html")) {
          throw new Error("Erro no servidor ao buscar QR Code. Verifique o gateway ou logs do servidor.")
        } else if (qrResponse.status === 404) {
          throw new Error(`Sessão '${tempSessionName}' não encontrada no servidor ao buscar QR Code.`)
        }
        throw new Error(`API retornou tipo inesperado (${contentType || "N/A"}) ao invés de JSON para QR Code.`)
      }

      // Now parse JSON
      const qrResult = await qrResponse.json()
      console.log(`[Frontend] <- Response from Local API (Get QR): ${qrResponse.status}`, qrResult)

      if (!qrResponse.ok) {
        // Handle specific non-OK statuses
        if (qrResponse.status === 409 || qrResponse.status === 422) {
          // Conflict or Unprocessable Entity
          console.warn(
            "[Frontend] QR API returned 409/422. Session might be connecting/connected elsewhere or in error state.",
          )
          // Attempt to check the *actual* status
          try {
            const statusCheckResponse = await fetch(`/api/sessions/${tempSessionName}/status`, {
              cache: "no-store",
            })
            if (statusCheckResponse.ok) {
              const statusData = await statusCheckResponse.json()
              const currentState = statusData.state || statusData.status
              if (
                currentState === "CONNECTED" ||
                currentState === "WORKING" ||
                currentState === "AUTHENTICATED" ||
                statusData.connected === true
              ) {
                console.log("[Frontend] Conflict resolved: Session is actually connected.")
                setConnectionStatus("connected")
                setQrCode(null)
                setLastConnection(new Date().toLocaleString())
                await updateSessionStatus(user.email, "CONNECTED") // Update Firestore
              } else {
                throw new Error(
                  `Conflito ao obter QR Code (Status: ${currentState || "desconhecido"}). Tente novamente.`,
                )
              }
            } else {
              throw new Error("Conflito ao obter QR Code e falha ao verificar status real. Tente novamente.")
            }
          } catch (statusCheckError) {
            throw new Error(
              statusCheckError instanceof Error ? statusCheckError.message : "Erro verificando status pós-conflito.",
            )
          }
        } else if (qrResponse.status === 404) {
          throw new Error(`Sessão '${tempSessionName}' não encontrada no servidor ao buscar QR Code.`)
        } else {
          // General error from QR endpoint
          throw new Error(qrResult.message || `Falha ao obter QR Code: Status ${qrResponse.status}`)
        }
      } else {
        // --- 6. Process Successful QR Response (Status 200 OK) ---
        if (qrResult.qrCode) {
          console.log("[Frontend] QR Code received. Displaying and starting status check.")
          setQrCode(qrResult.qrCode) // Display the QR code (assuming it's base64 data URI)
          setConnectionStatus("connecting") // Ensure status is connecting
          startStatusChecking(tempSessionName) // Start polling for connection success
        } else if (
          qrResult.connected === true ||
          qrResult.authenticated === true ||
          qrResult.state === "CONNECTED" ||
          qrResult.state === "WORKING" ||
          qrResult.state === "AUTHENTICATED"
        ) {
          // API indicates already connected during QR request
          console.log("[Frontend] QR API reported session already connected.")
          setConnectionStatus("connected")
          setQrCode(null)
          setLastConnection(new Date().toLocaleString())
          await updateSessionStatus(user.email, "CONNECTED") // Update Firestore
        } else {
          // OK response but unexpected content
          console.warn("[Frontend] OK response from QR API, but no QR code or connected status:", qrResult)
          throw new Error("Resposta inesperada do servidor ao buscar QR Code. Verifique os logs.")
        }
      }
    } catch (error) {
      // --- 7. General Error Handling ---
      console.error("[Frontend] GENERAL ERROR in generateQRCode flow:", error)
      setConnectionStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido ao gerar QR Code.")
      setQrCode(null)
      setSessionName(null) // Clear session name on error
      // Ensure interval is cleared on error
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    } finally {
      // --- 8. Final UI State Update ---
      setIsGeneratingQR(false) // Ensure button is re-enabled
    }
  }

  // --- Function to Start Periodic Status Checking After QR Display ---
  const startStatusChecking = (sessionNameToCheck: string) => {
    // Clear any existing interval first
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
      console.log("[StatusCheck] Cleared previous interval before starting new one.")
    }

    console.log(`[StatusCheck] Starting for ${sessionNameToCheck} (Interval: 5s, Timeout: 2min)`)

    let attemptCount = 0
    const maxAttempts = 24 // 24 attempts * 5 seconds = 120 seconds (2 minutes)

    statusCheckInterval = setInterval(async () => {
      // Stop conditions
      if (
        attemptCount >= maxAttempts ||
        connectionStatus === "connected" ||
        connectionStatus === "error" ||
        sessionName !== sessionNameToCheck // Stop if user initiated a new QR generation
      ) {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval)
          statusCheckInterval = null
          console.log(
            `[StatusCheck] Stopped for ${sessionNameToCheck}. Reason: Attempts=${attemptCount}, Status=${connectionStatus}, SessionChanged=${sessionName !== sessionNameToCheck}.`,
          )

          // If stopped due to timeout while still 'connecting'
          if (attemptCount >= maxAttempts && connectionStatus === "connecting" && sessionName === sessionNameToCheck) {
            console.warn("[StatusCheck] Timeout reached waiting for scan.")
            setConnectionStatus("error")
            setQrCode(null)
            setErrorMessage("Tempo expirado para escanear o QR Code. Gere um novo.")
            setSessionName(null) // Clear session name on timeout error
          }
        }
        return // Exit interval callback
      }

      attemptCount++

      try {
        console.log(
          `[StatusCheck] Attempt ${attemptCount}/${maxAttempts} -> GET /api/sessions/${sessionNameToCheck}/status`,
        )
        const statusResponse = await fetch(`/api/sessions/${sessionNameToCheck}/status`, { cache: "no-store" })

        // Check for non-JSON response first
        const contentType = statusResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await statusResponse.text()
          console.warn(
            `[StatusCheck] Non-JSON response (${statusResponse.status}, Type: ${contentType || "N/A"}). Body: ${responseText.substring(0, 100)}...`,
          )
          // Don't immediately fail, could be a temporary glitch, let timeout handle persistent issues unless it's 404
          if (statusResponse.status === 404) {
            console.error(`[StatusCheck] Session ${sessionNameToCheck} not found (404). Stopping check.`)
            setErrorMessage(`Sessão ${sessionNameToCheck} não encontrada. Gere um novo QR code.`)
            setConnectionStatus("error")
            setQrCode(null)
            setSessionName(null)
            if (statusCheckInterval) clearInterval(statusCheckInterval)
            statusCheckInterval = null
          }
          return // Skip processing this interval if response wasn't JSON (unless 404)
        }

        const statusResult = await statusResponse.json()
        console.log(`[StatusCheck] <- Response ${statusResponse.status}:`, statusResult)

        if (!statusResponse.ok) {
          console.warn(`[StatusCheck] Non-OK status (${statusResponse.status}) from API.`)
          // Don't immediately fail, let timeout handle persistent issues unless it's 404 (handled above)
          return
        }

        // --- Process OK Status Response ---
        const currentState = statusResult.state || statusResult.status
        if (
          currentState === "CONNECTED" ||
          currentState === "WORKING" ||
          currentState === "AUTHENTICATED" ||
          statusResult.connected === true ||
          statusResult.authenticated === true
        ) {
          console.log("[StatusCheck] CONNECTED!")
          setConnectionStatus("connected")
          setQrCode(null) // Clear QR
          setLastConnection(new Date().toLocaleString())
          if (user?.email) {
            await updateSessionStatus(user.email, "CONNECTED") // Update Firestore
          }
          // Stop the interval (handled by the check at the beginning of the interval)
        } else {
          console.log(`[StatusCheck] Current status: ${currentState || "Unknown"}`)
          // Keep polling if status is 'STARTING', 'PAIRING', 'SCAN_QR_CODE', etc.
        }
      } catch (error) {
        // Network or other fetch errors during status check
        console.error(`[StatusCheck] Network/Fetch error checking status for ${sessionNameToCheck}:`, error)
        // Don't immediately set to error, allow a few retries implicitly via the interval/timeout mechanism
      }
    }, 5000) // Check every 5 seconds
  }

  // --- Render Component ---
  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="configuracoes" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-0 md:ml-[196px]">
        {" "}
        {/* Adjust margin for smaller screens */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Configurações</h1>
          <p className="text-gray-600 mb-6">Gerencie as configurações do sistema e conexões</p>

          {/* --- WhatsApp Connection Section --- */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">Conexão WhatsApp</CardTitle>
                    <CardDescription>Conecte sua conta para enviar mensagens automáticas</CardDescription>
                  </div>
                  {/* Dynamic Status Badge */}
                  <div className="flex-shrink-0 mt-2 sm:mt-0">
                    <ConnectionStatusBadge
                      status={connectionStatus}
                      setConnectionStatus={setConnectionStatus}
                      setLastConnection={setLastConnection}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Dynamic Central Area based on connectionStatus */}
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
                        <div className="text-xs text-blue-600 bg-white p-1.5 mt-1 rounded border border-blue-100 font-mono break-words">
                          Nome: {sessionName || "N/A"}
                        </div>
                      </div>

                      <Alert variant="default" className="mt-4 max-w-md bg-yellow-50 border-yellow-100">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800 text-sm">Desconexão</AlertTitle>
                        <AlertDescription className="text-yellow-700 text-xs">
                          Para usar outra conta ou reconectar, primeiro desconecte este aparelho em: WhatsApp &gt;
                          Configurações &gt; Aparelhos Conectados.
                        </AlertDescription>
                      </Alert>
                      {/* Optional: Add a disconnect button here if needed */}
                    </div>
                  )}

                  {/* --- CONNECTING / WAITING FOR SCAN State --- */}
                  {connectionStatus === "connecting" && (
                    <div className="flex flex-col items-center text-center">
                      {qrCode ? ( // Show QR Code
                        <>
                          <div className="mb-4 p-1 border bg-white shadow-md">
                            <img
                              src={qrCode || "/placeholder.svg"} // Assumes qrCode is a data URI (e.g., 'data:image/png;base64,...')
                              alt="QR Code WhatsApp"
                              className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                            />
                          </div>
                          <h3 className="text-base sm:text-lg font-medium mb-2">Escaneie o QR Code</h3>
                          <p className="text-gray-600 max-w-sm mb-3 text-xs sm:text-sm px-2">
                            Abra o WhatsApp no seu celular &gt; Configurações &gt; Aparelhos Conectados &gt; Conectar um
                            Aparelho.
                          </p>
                          {sessionName && (
                            <p className="text-xs sm:text-sm text-blue-600 mb-3">
                              Iniciando sessão:{" "}
                              <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{sessionName}</span>
                            </p>
                          )}
                          <div className="flex items-center text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 mb-4 text-xs sm:text-sm">
                            <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
                            <span>Aguardando leitura... (expira em ~2 min)</span>
                          </div>

                          {/* "Cancel" button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => {
                              setConnectionStatus("disconnected")
                              setQrCode(null)
                              setErrorMessage(null)
                              setSessionName(null)
                              if (statusCheckInterval) {
                                clearInterval(statusCheckInterval)
                                statusCheckInterval = null
                              }
                              // Optionally call an API endpoint to explicitly stop/logout the session on the server
                              console.log("QR Scan Cancelled by user.")
                            }}
                          >
                            Cancelar
                          </Button>
                        </> // Show Loading Spinner
                      ) : (
                        <>
                          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500 animate-spin mb-4" />
                          <h3 className="text-base sm:text-lg font-medium mb-2">Gerando QR Code...</h3>
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
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3" // Larger button
                        onClick={generateQRCode}
                        disabled={isGeneratingQR}
                        size="lg"
                      >
                        {isGeneratingQR ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2" />
                            Gerar QR Code
                          </>
                        )}
                      </Button>
                      {userSessionInfo.hasSession && userSessionInfo.sessionName && (
                        <p className="text-xs text-gray-400 mt-4">(Sessão anterior: {userSessionInfo.sessionName})</p>
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
                    Mantenha seu celular conectado à internet para que a conexão com o WhatsApp permaneça ativa após a
                    leitura do QR Code.
                  </AlertDescription>
                </Alert>
                <div className="text-xs text-gray-500 px-1">
                  <p>
                    Ao conectar sua conta, você utiliza a API configurada pelo administrador. Siga as políticas de uso.
                    A conexão pode levar alguns instantes para ser estabelecida.
                  </p>
                </div>
              </CardFooter>
            </Card>

            {/* --- System Configuration Section --- */}
            <div className="mt-6">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl">Configurações Gerais</CardTitle>
                  <CardDescription>Ajuste o horário de envio e personalização</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {" "}
                    {/* Increased spacing */}
                    {/* --- Send Time Setting --- */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h3 className="font-medium text-base sm:text-lg">Horário Padrão de Envio</h3>
                      </div>
                      <div className="bg-green-50/60 p-4 rounded-lg border border-green-100">
                        <div className="flex flex-col items-center">
                          <Label htmlFor="hora" className="text-center mb-2 text-sm text-green-800">
                            Mensagens automáticas (aniversários, etc.) serão enviadas neste horário:
                          </Label>
                          <Input
                            id="hora"
                            type="time"
                            value={horarioSelecionado}
                            className="text-center text-lg font-medium w-36 sm:w-40 bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                            onChange={(e) => {
                              const newTime = e.target.value
                              if (newTime) {
                                setHorarioSelecionado(newTime)
                                // Save directly or use confirmation modal
                                // saveTimeToFirestore(newTime); // Direct save example
                                setShowConfirmModal(true) // Confirmation modal example
                              }
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-2">Horário de Brasília (GMT-3)</p>

                          {/* Countdown Timer */}
                          <CountdownTimer targetTime={horarioSelecionado} />
                        </div>
                      </div>
                    </div>
                    {/* --- Message Personalization Setting --- */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-medium text-base sm:text-lg">Personalização de Mensagens</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3 p-3 bg-indigo-50/50 rounded-md border border-indigo-100">
                          <Switch
                            id="use-name"
                            checked={usePersonalizedName}
                            onCheckedChange={setUsePersonalizedName}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor="use-name" className="font-medium text-sm sm:text-base text-indigo-900">
                              Incluir nome do contato automaticamente
                            </Label>
                            <p className="text-xs sm:text-sm text-indigo-700 mt-1">
                              Se ativado, a tag{" "}
                              <code className="text-xs bg-indigo-100 px-1 py-0.5 rounded font-mono">{`{nome}`}</code> na
                              sua mensagem será substituída pelo primeiro nome do contato.
                            </p>
                          </div>
                        </div>

                        {/* Example Box */}
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

                        {/* How-to Use Box */}
                        <Alert variant="default" className="bg-blue-50 border-blue-100">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800 text-sm">Como Usar</AlertTitle>
                          <AlertDescription className="text-blue-700 text-xs">
                            Basta incluir{" "}
                            <code className="text-xs bg-blue-100 px-1 py-0.5 rounded font-mono">{`{nome}`}</code> no
                            texto das suas mensagens onde desejar que o primeiro nome apareça. O sistema o substituirá
                            automaticamente.
                          </AlertDescription>
                        </Alert>
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
                padrão para o envio automático de mensagens de aniversário?
              </p>
              <div className="flex gap-3 w-full justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmModal(false)
                    // Optional: Revert horarioSelecionado state if needed
                    // loadSavedTime(); // Re-fetch from DB to revert UI
                  }}
                  className="flex-1"
                >
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

// --- Countdown Timer Component ---
function CountdownTimer({ targetTime }: { targetTime: string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("Calculando...")
  const [isNear, setIsNear] = useState(false) // Only show if target is within 24 hours
  const { user } = useAuth()
  const { toast } = useToast()

  // Function to check birthdays and send messages (now separate from interval calculation)
  const checkAndSendBirthdayMessages = async () => {
    if (!user?.email) {
      console.log("[AutoSend] No user logged in. Skipping birthday check.")
      return
    }

    console.log("[AutoSend] Checking birthdays for today...")

    try {
      // Get the current user's active WhatsApp session
      const userSession = await checkUserSession(user.email)
      if (!userSession.hasSession || !userSession.sessionName) {
        console.error("[AutoSend] WhatsApp session not found for user:", user.email)
        toast({
          title: "Falha no Envio Automático",
          description: "Sessão do WhatsApp não encontrada. Conecte novamente nas Configurações.",
          variant: "destructive",
        })
        return
      }

      const activeSessionName = userSession.sessionName
      console.log(`[AutoSend] Using session: ${activeSessionName}`)

      // Get today's date parts
      const today = new Date()
      const currentDay = today.getDate()
      const currentMonth = today.getMonth() + 1 // JS months are 0-11

      // Query contacts from Firestore for the current user
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`) // Adjust path if needed
      const snapshot = await getDocs(contactsRef)

      const birthdayContacts = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() })) // Include doc ID and data
        .filter((contact) => {
          if (!contact.data_de_nascimento || typeof contact.data_de_nascimento !== "string") return false

          try {
            let birthDay: number, birthMonth: number
            // Handle DD/MM/YYYY or DD/MM format
            if (contact.data_de_nascimento.includes("/")) {
              const parts = contact.data_de_nascimento.split("/")
              birthDay = Number.parseInt(parts[0], 10)
              birthMonth = Number.parseInt(parts[1], 10)
            }
            // Handle YYYY-MM-DD format
            else if (contact.data_de_nascimento.includes("-")) {
              const parts = contact.data_de_nascimento.split("-")
              // Ensure correct order (YYYY-MM-DD)
              if (parts.length === 3 && parts[0].length === 4) {
                birthMonth = Number.parseInt(parts[1], 10)
                birthDay = Number.parseInt(parts[2], 10)
              } else {
                console.warn(
                  `[AutoSend] Invalid date format (YYYY-MM-DD expected): ${contact.data_de_nascimento} for contact ${contact.id}`,
                )
                return false // Invalid format
              }
            } else {
              console.warn(
                `[AutoSend] Unrecognized date format: ${contact.data_de_nascimento} for contact ${contact.id}`,
              )
              return false // Unrecognized format
            }

            // Validate parsed numbers
            if (
              isNaN(birthDay) ||
              isNaN(birthMonth) ||
              birthDay < 1 ||
              birthDay > 31 ||
              birthMonth < 1 ||
              birthMonth > 12
            ) {
              console.warn(
                `[AutoSend] Invalid date parsed: Day=${birthDay}, Month=${birthMonth} from ${contact.data_de_nascimento} for contact ${contact.id}`,
              )
              return false
            }

            // Check if it's birthday today
            return birthDay === currentDay && birthMonth === currentMonth
          } catch (parseError) {
            console.error(
              `[AutoSend] Error parsing date '${contact.data_de_nascimento}' for contact ${contact.id}:`,
              parseError,
            )
            return false
          }
        })

      // Proceed if there are contacts celebrating today
      if (birthdayContacts.length > 0) {
        console.log(`[AutoSend] Found ${birthdayContacts.length} birthday contact(s) today.`)

        const birthdayMessages = [
          "Feliz aniversário, {nome}! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano.",
          "Parabéns pelo seu dia, {nome}! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
          "Felicitações pelo seu aniversário, {nome}! Que este novo ciclo seja marcado por bênçãos e realizações. Um grande abraço!",
          "{nome}, feliz aniversário! Muita saúde, sucesso e felicidades hoje e sempre!",
        ]

        let successCount = 0
        let failureCount = 0

        // Send message to each birthday contact
        for (const contact of birthdayContacts) {
          // Choose a random message template
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          let messageToSend = birthdayMessages[randomIndex]

          // Personalize with first name if available
          const firstName = contact.nome ? contact.nome.split(" ")[0] : "você" // Default to "você" if name is missing
          messageToSend = messageToSend.replace("{nome}", firstName)

          if (contact.telefone) {
            const phoneNumber = contact.telefone // Assuming phone number is correctly formatted
            console.log(
              `[AutoSend] Preparing to send to ${contact.nome || contact.id} (${phoneNumber}): "${messageToSend}"`,
            )

            try {
              const response = await fetch("/api/whatsapp/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionName: activeSessionName, // Use the active session
                  phoneNumber: phoneNumber,
                  message: messageToSend,
                  userEmail: user.email, // For logging/tracking on the backend
                }),
              })

              const responseData = await response.json()

              if (!response.ok) {
                console.error(
                  `[AutoSend] ❌ Failed to send to ${contact.nome || contact.id} (${phoneNumber}). Status: ${response.status}`,
                  responseData,
                )
                failureCount++
                // Optionally store failure details somewhere
              } else {
                console.log(
                  `[AutoSend] ✅ Successfully sent to ${contact.nome || contact.id} (${phoneNumber})`,
                  responseData,
                )
                successCount++
                // Optionally update contact status in Firestore to 'sent_today'
              }
              // Add a small delay between messages to avoid rate limiting issues
              await new Promise((resolve) => setTimeout(resolve, 1500)) // 1.5 second delay
            } catch (sendError) {
              console.error(
                `[AutoSend] ❌ Network/fetch error sending to ${contact.nome || contact.id} (${phoneNumber}):`,
                sendError,
              )
              failureCount++
            }
          } else {
            console.warn(`[AutoSend] Skipping contact ${contact.nome || contact.id} due to missing phone number.`)
            failureCount++ // Count as failure if no phone number
          }
        } // End of loop through contacts

        // Notify user about the outcome
        if (successCount > 0 || failureCount > 0) {
          toast({
            title: "Envio de Mensagens de Aniversário",
            description: `${successCount} enviada(s) com sucesso, ${failureCount} falha(s).`,
            variant: failureCount > 0 ? "warning" : "default",
          })
        }
      } else {
        console.log("[AutoSend] No contacts found with birthdays today.")
        // Optionally notify user that no birthdays were found
        // toast({ title: "Aniversariantes", description: "Nenhum aniversariante encontrado para hoje." })
      }
    } catch (error) {
      console.error("[AutoSend] Error during birthday check/send process:", error)
      toast({
        title: "Erro no Envio Automático",
        description: "Ocorreu um erro ao verificar/enviar mensagens de aniversário.",
        variant: "destructive",
      })
    }
  }

  // useEffect for countdown calculation and display
  useEffect(() => {
    const calculateTime = () => {
      try {
        const now = new Date()
        const [targetHours, targetMinutes] = targetTime.split(":").map(Number)

        if (isNaN(targetHours) || isNaN(targetMinutes)) {
          throw new Error("Invalid target time format")
        }

        const targetDate = new Date()
        targetDate.setHours(targetHours, targetMinutes, 0, 0) // Target time today

        // If target time has already passed today, set target for tomorrow
        if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1)
        }

        const diffInSeconds = differenceInSeconds(targetDate, now)

        // Show countdown only if within the next 24 hours
        if (diffInSeconds >= 0 && diffInSeconds <= 86400) {
          // 86400 seconds = 24 hours
          const hours = Math.floor(diffInSeconds / 3600)
          const minutes = Math.floor((diffInSeconds % 3600) / 60)
          const seconds = diffInSeconds % 60
          const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          setTimeRemaining(formattedTime)
          setIsNear(true)

          // Check if it's exactly the target time (within a small tolerance like 1 second)
          if (diffInSeconds <= 1) {
            console.log(`[Countdown] Target time ${targetTime} reached. Triggering birthday check.`)
            checkAndSendBirthdayMessages() // Trigger the sending logic
            // Optional: Add a flag to prevent multiple triggers within a short interval if needed
          }
        } else {
          // Target time is more than 24 hours away or invalid
          setTimeRemaining("...")
          setIsNear(false)
        }
      } catch (error) {
        console.error("Error calculating time remaining:", error)
        setTimeRemaining("Erro")
        setIsNear(false)
      }
    }

    calculateTime() // Initial calculation
    const interval = setInterval(calculateTime, 1000) // Update every second

    return () => clearInterval(interval) // Cleanup interval
  }, [targetTime, user]) // Recalculate if targetTime or user changes

  // Render only if the target time is within 24 hours
  if (!isNear) return null

  return (
    <div className="mt-4 text-center">
      <p className="text-xs font-medium text-gray-600 mb-1">Próximo envio automático em:</p>
      <div className="bg-white px-3 py-1.5 rounded-md border border-green-200 inline-block">
        <span className="font-mono text-base sm:text-lg font-semibold text-green-700">{timeRemaining}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1.5 px-2">
        O sistema verificará e enviará mensagens de aniversário automaticamente neste horário.
      </p>
    </div>
  )
}
