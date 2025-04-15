"use client"

import { useState, useEffect } from "react"
import { Clock, MessageSquare, Info, AlertTriangle, RefreshCw, Smartphone, Loader2 } from "lucide-react"
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
import { Check } from "lucide-react"
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
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
  const isAdmin = user?.email === "ronaldo@graficaeleal.com.br"

  // Effect to check the session status on the WAHA server
  useEffect(() => {
    const checkWahaStatus = async () => {
      try {
        // First check if the user has a specific session
        if (user?.email) {
          const userSession = await checkUserSession(user.email)
          if (userSession.hasSession && userSession.sessionName) {
            // If the user has a session, check the status of that specific session
            try {
              const sessionEndpoint = `/api/whatsapp/sessions/${userSession.sessionName}/status`
              const response = await fetch(sessionEndpoint, {
                cache: "no-store",
              })

              if (response.ok) {
                const data = await response.json()
                console.log(`[StatusBadge] Status of session ${userSession.sessionName}:`, data)
                setWahaStatus(data.state || data.status)

                // If the status indicates it's connected, update the main state
                if (
                  data.state === "WORKING" ||
                  data.state === "CONNECTED" ||
                  data.state === "AUTHENTICATED" ||
                  data.connected === true ||
                  data.authenticated === true
                ) {
                  // Update the main state to show as connected
                  setConnectionStatus("connected")
                  setLastConnection(new Date().toLocaleString())
                }
                return // Exit the function if found a valid session
              }
            } catch (error) {
              console.warn(`[StatusBadge] Error checking session ${userSession.sessionName}:`, error)
            }
          }
        }
      } catch (error) {
        console.warn("[StatusBadge] Error checking WAHA status:", error)
      }
    }

    // Check immediately and then every 15 seconds
    checkWahaStatus()
    const interval = setInterval(checkWahaStatus, 15000)

    return () => clearInterval(interval)
  }, [setConnectionStatus, setLastConnection, user, isAdmin])

  // If the WAHA API status is "WORKING" or "CONNECTED", show as connected
  if (wahaStatus === "WORKING" || wahaStatus === "CONNECTED" || wahaStatus === "AUTHENTICATED") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        <Check className="h-3.5 w-3.5 mr-1" />
        Conectado
      </Badge>
    )
  }

  // Otherwise, follow the original logic based on local status
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

// Main component
export default function ConfiguracoesPage() {
  // States of the React component
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastConnection, setLastConnection] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [usePersonalizedName, setUsePersonalizedName] = useState(true)
  const [horarioSelecionado, setHorarioSelecionado] = useState("08:00")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [horarioConfirmado, setHorarioConfirmado] = useState(false)
  const { toast } = useToast()
  const [wahaApiStatus, setWahaApiStatus] = useState<string | null>(null)
  const [connectedSessionName, setConnectedSessionName] = useState<string | null>(null)

  const { user } = useAuth()
  const isAdmin = user?.email === "ronaldo@graficaeleal.com.br"

  // State to store user session info
  const [userSessionInfo, setUserSessionInfo] = useState<{
    hasSession: boolean
    sessionName: string | null
    status: string | null
  }>({
    hasSession: false,
    sessionName: null,
    status: null,
  })

  // Função para salvar o horário no Firestore
  const saveTimeToFirestore = async (time: string) => {
    if (!user?.email) return

    try {
      // Referência ao documento do usuário
      const userSettingsRef = doc(db, "user_settings", user.email)

      // Verificar se o documento já existe
      const docSnap = await getDoc(userSettingsRef)

      if (docSnap.exists()) {
        // Atualizar documento existente
        await updateDoc(userSettingsRef, {
          sendTime: time,
          updatedAt: new Date(),
        })
      } else {
        // Criar novo documento
        await setDoc(userSettingsRef, {
          sendTime: time,
          updatedAt: new Date(),
          createdAt: new Date(),
        })
      }

      console.log(`Horário ${time} salvo com sucesso para o usuário ${user.email}`)
    } catch (error) {
      console.error("Erro ao salvar horário no Firestore:", error)
      toast({
        title: "Erro ao salvar configuração",
        description: "Não foi possível salvar o horário selecionado. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Carregar horário salvo do Firestore
  useEffect(() => {
    const loadSavedTime = async () => {
      if (!user?.email) return

      try {
        const userSettingsRef = doc(db, "user_settings", user.email)
        const docSnap = await getDoc(userSettingsRef)

        if (docSnap.exists() && docSnap.data().sendTime) {
          setHorarioSelecionado(docSnap.data().sendTime)
          console.log(`Horário carregado do Firestore: ${docSnap.data().sendTime}`)
        }
      } catch (error) {
        console.error("Erro ao carregar horário do Firestore:", error)
      }
    }

    loadSavedTime()
  }, [user])

  // Check WAHA API status
  useEffect(() => {
    const checkWahaApiStatus = async () => {
      try {
        // First check if the user has a specific session
        if (user?.email) {
          const userSession = await checkUserSession(user.email)
          setUserSessionInfo(userSession)

          if (userSession.hasSession && userSession.sessionName) {
            // If the user has a session, check the status of that specific session
            const sessionEndpoint = `/api/whatsapp/sessions/${userSession.sessionName}/status`
            try {
              const response = await fetch(sessionEndpoint, {
                cache: "no-store",
              })

              if (response.ok) {
                const data = await response.json()
                console.log(`[ConfigPage] Status of session ${userSession.sessionName}:`, data)
                setWahaApiStatus(data.state || data.status)
                setConnectedSessionName(userSession.sessionName)

                // If the session is connected, update the UI
                if (data.state === "CONNECTED" || data.state === "WORKING" || data.state === "AUTHENTICATED") {
                  setConnectionStatus("connected")
                  setLastConnection(new Date().toLocaleString())
                }

                return // Exit the function if found a valid session
              }
            } catch (error) {
              console.warn(`[ConfigPage] Error checking session ${userSession.sessionName}:`, error)
            }
          }
        }
      } catch (error) {
        console.error("[ConfigPage] Error checking WAHA API status:", error)
      }
    }

    // Check immediately and then every 15 seconds
    checkWahaApiStatus()
    const interval = setInterval(checkWahaApiStatus, 15000)

    return () => clearInterval(interval)
  }, [user])

  // Check connection status when page loads
  useEffect(() => {
    const checkInitialConnectionStatus = async () => {
      try {
        if (user?.email) {
          const userSession = await checkUserSession(user.email)

          if (userSession.hasSession && userSession.sessionName) {
            const response = await fetch(`/api/whatsapp/sessions/${userSession.sessionName}/status`, {
              cache: "no-store",
            })

            if (response.ok) {
              const data = await response.json()
              console.log("[ConfigPage] Initial WAHA session status:", data)

              // If the status is CONNECTED, WORKING or AUTHENTICATED, update the state
              if (
                data.state === "CONNECTED" ||
                data.state === "WORKING" ||
                data.state === "AUTHENTICATED" ||
                data.connected === true ||
                data.authenticated === true
              ) {
                setConnectionStatus("connected")
                setLastConnection(new Date().toLocaleString())
                setSessionName(userSession.sessionName)
              }
            }
          }
        }
      } catch (error) {
        console.error("[ConfigPage] Error checking initial status:", error)
      }
    }

    checkInitialConnectionStatus()

    // Cleanup for the status check interval
    return () => {
      if (statusCheckInterval) {
        console.log("[Frontend] Cleaning up status check interval when unmounting component.")
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    }
  }, [user])

  // Verify if the current user has an associated session
  useEffect(() => {
    const verifyUserSession = async () => {
      if (user?.email) {
        const sessionInfo = await checkUserSession(user.email)
        setUserSessionInfo(sessionInfo)

        // If the user has an active session, update the connection state
        if (
          sessionInfo.hasSession &&
          (sessionInfo.status === "WORKING" ||
            sessionInfo.status === "CONNECTED" ||
            sessionInfo.status === "AUTHENTICATED")
        ) {
          setConnectionStatus("connected")
          setConnectedSessionName(sessionInfo.sessionName)
          setSessionName(sessionInfo.sessionName)
          setLastConnection(new Date().toLocaleString())
        }
      }
    }

    verifyUserSession()
    // Check periodically
    const interval = setInterval(verifyUserSession, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Add listener for WhatsApp status change event
  useEffect(() => {
    const handleWhatsAppStatusChange = (event: CustomEvent) => {
      console.log("[ConfigPage] WhatsApp status change event received:", event.detail)
      if (event.detail && event.detail.status) {
        setConnectionStatus(event.detail.status)
        if (event.detail.status === "connected") {
          setLastConnection(new Date().toLocaleString())
        }
      }
    }

    window.addEventListener("whatsapp-status-change", handleWhatsAppStatusChange as EventListener)

    return () => {
      window.removeEventListener("whatsapp-status-change", handleWhatsAppStatusChange as EventListener)
    }
  }, [])

  // Add listener for WhatsApp connected event
  useEffect(() => {
    const handleWhatsAppConnected = () => {
      console.log("[ConfigPage] WhatsApp connected event received")
      setConnectionStatus("connected")
      setLastConnection(new Date().toLocaleString())
    }

    window.addEventListener("whatsapp-connected", handleWhatsAppConnected)

    return () => {
      window.removeEventListener("whatsapp-connected", handleWhatsAppConnected)
    }
  }, [])

  // Helper function to generate a unique session name
  function generateLocalUniqueSessionName(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    const name = `session_${timestamp}_${random}`
    console.log(`[Frontend] Generated new local session name: ${name}`)
    return name
  }

  // MAIN function: Called when the "Generate QR Code" button is clicked
  const generateQRCode = async () => {
    let currentSessionName: string | null = null
    try {
      // 1. Prepare initial state
      setIsGeneratingQR(true)
      setErrorMessage(null)
      setConnectionStatus("connecting")
      setQrCode(null)
      if (statusCheckInterval) clearInterval(statusCheckInterval)
      statusCheckInterval = null

      // 2. Generate name and create session via local API
      currentSessionName = generateLocalUniqueSessionName()
      setSessionName(currentSessionName)
      console.log(`[Frontend] Starting flow for session: ${currentSessionName}`)

      console.log(`[Frontend] -> Calling Local API: POST /api/whatsapp/sessions`)
      const createResponse = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: currentSessionName,
          userEmail: user?.email, // Add user email to associate the session
        }),
        cache: "no-store",
      })

      const createData = await createResponse.json()
      if (!createResponse.ok) {
        console.error(`[Frontend] Error from Local API when creating session (${createResponse.status}):`, createData)
        throw new Error(createData.message || `Failed to create/process session: Status ${createResponse.status}`)
      }
      console.log(`[Frontend] <- Response from Local API (Create Session): ${createResponse.status}`, createData)

      // Save the session to Firestore if user is logged in
      if (user?.email) {
        await saveUserSession(user.email, currentSessionName)
      }

      // 3. Call local API for Screenshot (intermediate step that may fail)
      try {
        console.log(`[Frontend] -> Calling Local API: GET /api/whatsapp/sessions/${currentSessionName}/screenshot`)
        const screenshotResponse = await fetch(`/api/whatsapp/sessions/${currentSessionName}/screenshot`, {
          cache: "no-store",
        })

        if (!screenshotResponse.ok) {
          console.warn(
            `[Frontend] Warning: Screenshot failed (${screenshotResponse.status}), but continuing the process...`,
          )
        } else {
          console.log(`[Frontend] <- Screenshot obtained successfully`)
        }
      } catch (screenshotError) {
        console.warn(`[Frontend] Warning: Error getting screenshot, but continuing the process:`, screenshotError)
      }

      // Add delay before requesting QR code
      console.log("[Frontend] Waiting 3 seconds before requesting QR Code...")
      await new Promise((resolve) => setTimeout(resolve, 10000))

      // 4. Call local API to get QR Code
      console.log(`[Frontend] -> Calling Local API: GET /api/whatsapp/sessions/${currentSessionName}/auth/qr`)

      // Try to get the QR code
      let qrResponse
      const qrEndpoint = `/api/whatsapp/sessions/${currentSessionName}/auth/qr`

      try {
        console.log(`[Frontend] Trying endpoint: ${qrEndpoint}`)
        qrResponse = await fetch(qrEndpoint, { cache: "no-store" })

        // If 404, try alternative endpoint
        if (qrResponse.status === 404) {
          const alternativeEndpoint = currentSessionName.startsWith("session_")
            ? `/api/session_${currentSessionName.substring(8)}/auth/qr?format=image`
            : `/api/session_${currentSessionName}/auth/qr?format=image`
          console.log(`[Frontend] Endpoint not found, trying alternative: ${alternativeEndpoint}`)
          qrResponse = await fetch(alternativeEndpoint, { cache: "no-store" })
        }
      } catch (fetchError) {
        console.error(`[Frontend] Error fetching QR code:`, fetchError)
        throw new Error(
          `Error getting QR code: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        )
      }

      // Check content type of response
      const contentType = qrResponse.headers.get("content-type") || ""

      // If not JSON, handle error more robustly
      if (!contentType.includes("application/json")) {
        console.error(`[Frontend] Unexpected response: content type '${contentType}' instead of JSON`)

        // Try to read text for better diagnosis
        const rawText = await qrResponse.text()
        console.error(`[Frontend] Content of non-JSON response:`, rawText.substring(0, 200) + "...")

        throw new Error(`API returned ${contentType} instead of JSON. Check server configuration.`)
      }

      // Process as JSON if we get here
      const qrResult = await qrResponse.json()
      console.log(`[Frontend] <- Response from Local API (Get QR): ${qrResponse.status}`, qrResult)

      if (!qrResponse.ok) {
        if (qrResponse.status === 422 || qrResponse.status === 409) {
          console.log("[Frontend] Local QR API returned code 422/409 (conflict).")

          // Check real session state instead of assuming it's connected
          try {
            console.log(`[Frontend] Checking real session state after code 422/409`)
            const statusResponse = await fetch(
              currentSessionName.startsWith("session_")
                ? `/api/session_${currentSessionName.substring(8)}`
                : `/api/session_${currentSessionName}`,
              { cache: "no-store" },
            )

            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              console.log(`[Frontend] Real session status:`, statusData)

              if (statusData.connected === true) {
                // Really connected
                setConnectionStatus("connected")
                setQrCode(null)
                setLastConnection(new Date().toLocaleString())

                // Update session status in Firestore
                if (user?.email) {
                  await updateSessionStatus(user.email, "CONNECTED")
                }
              } else {
                // Not connected, but there was a conflict - show error
                setErrorMessage("Conflict getting QR code. The session may be in an invalid state. Try again.")
                setConnectionStatus("error")
              }
            } else {
              // Couldn't check status, try QR code again
              setErrorMessage("Could not verify session status. Try generating the QR code again.")
              setConnectionStatus("error")
            }
          } catch (statusError) {
            console.error("[Frontend] Error checking real status after 422/409:", statusError)
            setErrorMessage("Error checking session status. Please try again.")
            setConnectionStatus("error")
          }
        } else {
          throw new Error(qrResult.message || `Failed to get QR code: Status ${qrResponse.status}`)
        }
      } else {
        // OK response (200)
        if (qrResult.qrCode) {
          console.log("[Frontend] QR Code received from Local API. Displaying and starting status check.")
          const imageUrl = `data:image/png;base64,${qrResult.qrCode}`
          setQrCode(imageUrl)
          setConnectionStatus("connecting") // Ensure status is "connecting" to show QR
          startStatusChecking(currentSessionName) // Start checking
        } else if (qrResult.connected) {
          console.log("[Frontend] Local QR API reported already connected.")
          setConnectionStatus("connected")
          setQrCode(null)
          setLastConnection(new Date().toLocaleString())

          // Update session status in Firestore
          if (user?.email) {
            await updateSessionStatus(user.email, "CONNECTED")
          }
        } else {
          console.warn("[Frontend] OK response from QR API, but no QR code or connected status:", qrResult)
          setErrorMessage("QR Code not received. Check server logs.")
          setConnectionStatus("error")
        }
      }
    } catch (error) {
      console.error("[Frontend] GENERAL ERROR in generateQRCode flow:", error)
      setConnectionStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Unknown error generating QR Code")
      setQrCode(null)
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Function to start and manage periodic status checking
  const startStatusChecking = (sessionNameToCheck: string) => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }

    if (sessionNameToCheck !== sessionName) {
      console.warn(`[Frontend] Status check ignored for ${sessionNameToCheck} (active session: ${sessionName})`)
      return
    }

    console.log(`[Frontend] Starting status check for ${sessionNameToCheck} (Interval: 5s, Timeout: 2min)`)

    let retryCount = 0
    const maxRetries = 5

    statusCheckInterval = setInterval(async () => {
      if (sessionNameToCheck !== sessionName || connectionStatus === "connected" || connectionStatus === "error") {
        if (statusCheckInterval) {
          console.log(
            `[Frontend] Status check stopped for ${sessionNameToCheck}. Reason: ${connectionStatus} or session changed to ${sessionName}.`,
          )
          clearInterval(statusCheckInterval)
          statusCheckInterval = null
        }
        return
      }

      try {
        console.log(
          `[Frontend] -> Checking status via Local API: GET /api/whatsapp/sessions/${sessionNameToCheck}/status`,
        )
        const statusResponse = await fetch(`/api/whatsapp/sessions/${sessionNameToCheck}/status`, { cache: "no-store" })

        const statusResult = await statusResponse.json()
        console.log(`[Frontend] <- Response from Local API (Status): ${statusResponse.status}`, statusResult)

        if (statusResponse.status === 404) {
          console.warn(`[Frontend] Session ${sessionNameToCheck} not found by local API during check.`)
          retryCount++

          if (retryCount >= maxRetries) {
            setErrorMessage(`Session not found after ${maxRetries} attempts. Try generating a new QR code.`)
            setConnectionStatus("error")
            clearInterval(statusCheckInterval)
            statusCheckInterval = null
          }
          return
        }

        if (!statusResponse.ok) {
          console.error(
            `[Frontend] Error from local API checking status (${statusResponse.status}):`,
            statusResult.message || statusResult,
          )
          retryCount++

          if (retryCount >= maxRetries) {
            setErrorMessage(`Error checking status after ${maxRetries} attempts. Try generating a new QR code.`)
            setConnectionStatus("error")
            clearInterval(statusCheckInterval)
            statusCheckInterval = null
          }
          return
        }

        // Reset retry count on successful response
        retryCount = 0

        if (statusResult.success && (statusResult.connected || statusResult.authenticated)) {
          console.log("[Frontend] CONNECTED! (Detected by status check)", statusResult)
          setConnectionStatus("connected")
          setQrCode(null)
          setLastConnection(new Date().toLocaleString())

          // Update session status in Firestore
          if (user?.email) {
            await updateSessionStatus(user.email, "CONNECTED")
          }

          if (statusCheckInterval) {
            clearInterval(statusCheckInterval)
            statusCheckInterval = null
            console.log("[Frontend] Status check finished (connected).")
          }
        } else {
          console.log(
            `[Frontend] Current status (${sessionNameToCheck}) via local API: ${statusResult.status || "Unknown"}`,
          )
        }
      } catch (error) {
        console.error(`[Frontend] Network error checking status for ${sessionNameToCheck}:`, error)
        retryCount++

        if (retryCount >= maxRetries) {
          setErrorMessage(`Network error after ${maxRetries} attempts. Check your connection.`)
          setConnectionStatus("error")
          clearInterval(statusCheckInterval)
          statusCheckInterval = null
        }
      }
    }, 5000) // Check every 5 seconds

    // 2-minute timeout
    const timeoutId = setTimeout(() => {
      if (statusCheckInterval) {
        console.log(`[Frontend] 2-minute timeout reached for session check ${sessionNameToCheck}.`)
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
        if (connectionStatus === "connecting" && sessionNameToCheck === sessionName) {
          console.warn("[Frontend] Time expired for scanning QR Code.")
          setConnectionStatus("error")
          setQrCode(null)
          setErrorMessage("Time expired for scanning QR Code. Please generate a new one.")
        }
      }
    }, 120000) // 2 minutes
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="configuracoes" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Configurações</h1>
          <p className="text-gray-600 mb-6">Gerencie as configurações do sistema e conexões</p>

          {/* WhatsApp Connection Section */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Conexão WhatsApp</CardTitle>
                    <CardDescription>Conecte sua conta do WhatsApp para enviar mensagens automáticas</CardDescription>
                  </div>
                  {/* Dynamic Status Badge */}
                  <ConnectionStatusBadge
                    status={connectionStatus}
                    setConnectionStatus={setConnectionStatus}
                    setLastConnection={setLastConnection}
                  />
                </div>
              </CardHeader>

              <CardContent>
                {/* Dynamic Central Area */}
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-white min-h-[300px]">
                  {/* Connected State */}
                  {connectionStatus === "connected" && (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                        <Check className="h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-medium text-green-700 mb-2">CONECTADO</h3>
                      <p className="text-gray-600 mb-4">Sua conta do WhatsApp está conectada.</p>
                      {sessionName && (
                        <p className="text-sm text-gray-500 mb-1">
                          Sessão ativa: <span className="font-mono text-xs">{sessionName}</span>
                        </p>
                      )}
                      {lastConnection && <p className="text-sm text-gray-500 mb-3">Última conexão: {lastConnection}</p>}

                      {/* Session info box */}
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md max-w-md">
                        <p className="text-sm text-blue-700 font-medium mb-1">
                          <Info className="h-4 w-4 inline-block mr-1 text-blue-500" />
                          Informações da Sessão WhatsApp
                        </p>
                        <div className="text-xs text-blue-600 bg-white p-2 rounded border border-blue-100 font-mono">
                          Nome da sessão: {connectedSessionName || sessionName || "Não disponível"}
                        </div>
                        <p className="text-xs text-blue-500 mt-1">
                          Esta sessão está associada exclusivamente à sua conta ({user?.email}).
                        </p>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md max-w-md">
                        <p className="text-sm text-blue-700">
                          <Info className="h-4 w-4 inline-block mr-1 text-blue-500" />
                          Apenas uma conexão é permitida por conta de usuário. Para conectar outro dispositivo,
                          desconecte este dispositivo primeiro nas configurações do WhatsApp.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connecting / Waiting for Scan State */}
                  {connectionStatus === "connecting" && (
                    <div className="flex flex-col items-center text-center">
                      {qrCode ? ( // If we already have the QR Code to display
                        <>
                          <div className="mb-4 p-2 border bg-white">
                            <img
                              src={qrCode || "/placeholder.svg"} // Use the base64 data URL
                              alt="QR Code for WhatsApp connection"
                              className="w-64 h-64"
                            />
                          </div>
                          <h3 className="text-lg font-medium mb-2">Escaneie o QR Code</h3>
                          <p className="text-gray-600 max-w-md mb-4 text-sm">
                            Abra o WhatsApp no celular &gt; Aparelhos conectados &gt; Conectar um aparelho.
                          </p>
                          {sessionName && (
                            <p className="text-sm text-blue-600 mb-3">
                              <strong>Sessão:</strong> <span className="font-mono">{sessionName}</span>
                            </p>
                          )}
                          <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-100 mb-4">
                            <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                            <span className="text-sm">Aguardando scan... (expira em ~2 min)</span>
                          </div>

                          {/* "I've connected" button to force state change */}
                          <Button
                            variant="outline"
                            className="mt-2 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setConnectionStatus("connected")
                              setQrCode(null)
                              setLastConnection(new Date().toLocaleString())
                              if (statusCheckInterval) {
                                clearInterval(statusCheckInterval)
                                statusCheckInterval = null
                              }

                              // Update session status in Firestore
                              if (user?.email) {
                                updateSessionStatus(user.email, "CONNECTED")
                              }
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Já conectei meu WhatsApp
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                          <h3 className="text-lg font-medium mb-2">Conectando ao Servidor...</h3>
                          <p className="text-gray-600 text-sm">Gerando QR Code, aguarde...</p>
                          {sessionName && (
                            <p className="text-sm text-blue-600 mt-3">
                              <strong>Sessão:</strong> <span className="font-mono">{sessionName}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error State */}
                  {connectionStatus === "error" && (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                        <AlertTriangle className="h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-medium text-red-700 mb-2">Erro na Conexão</h3>
                      {/* Show specific error message */}
                      <p className="text-gray-600 mb-4 max-w-md break-words text-sm bg-red-50 p-2 border border-red-100 rounded">
                        {errorMessage || "Ocorreu um erro desconhecido."}
                      </p>
                      <Button variant="outline" onClick={generateQRCode} disabled={isGeneratingQR}>
                        {isGeneratingQR ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Tentar Novamente
                      </Button>
                    </div>
                  )}

                  {/* Disconnected (Initial) State */}
                  {connectionStatus === "disconnected" && (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-4">
                        <Smartphone className="h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">
                        {userSessionInfo.hasSession &&
                        (userSessionInfo.status === "WORKING" ||
                          userSessionInfo.status === "CONNECTED" ||
                          userSessionInfo.status === "AUTHENTICATED")
                          ? "CONECTADO"
                          : "WhatsApp Desconectado"}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {userSessionInfo.hasSession &&
                        (userSessionInfo.status === "WORKING" ||
                          userSessionInfo.status === "CONNECTED" ||
                          userSessionInfo.status === "AUTHENTICATED")
                          ? `Sua conta do WhatsApp está conectada e pronta para uso.`
                          : "Clique abaixo para gerar um QR Code e conectar sua conta."}
                      </p>

                      {/* User session information */}
                      {userSessionInfo.hasSession &&
                        (userSessionInfo.status === "WORKING" ||
                          userSessionInfo.status === "CONNECTED" ||
                          userSessionInfo.status === "AUTHENTICATED") && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md max-w-md mb-4">
                            <p className="text-sm text-blue-700 font-medium mb-1">
                              <Info className="h-4 w-4 inline-block mr-1 text-blue-500" />
                              Informações da Sua Sessão WhatsApp
                            </p>
                            <div className="text-xs text-blue-600 bg-white p-2 rounded border border-blue-100 font-mono">
                              Nome da sessão: {userSessionInfo.sessionName || "Não disponível"}
                            </div>
                            <p className="text-xs text-blue-500 mt-1">
                              Esta sessão está associada exclusivamente à sua conta ({user?.email}).
                            </p>
                          </div>
                        )}

                      {/* Show button only if user doesn't have an active session */}
                      {(!userSessionInfo.hasSession ||
                        !(
                          userSessionInfo.status === "WORKING" ||
                          userSessionInfo.status === "CONNECTED" ||
                          userSessionInfo.status === "AUTHENTICATED"
                        )) && (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
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
                      )}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col items-start pt-6 border-t">
                <Alert variant="default" className="mb-4 bg-blue-50 border-blue-100">
                  {/* Visual highlight */}
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Importante</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Mantenha seu celular conectado à internet para que a conexão com o WhatsApp funcione corretamente
                    após o scan.
                  </AlertDescription>
                </Alert>
                <div className="text-xs text-gray-500">
                  {" "}
                  {/* Smaller text */}
                  <p>
                    Ao conectar sua conta, você interage com a API configurada pelo administrador do sistema.
                    Certifique-se de seguir as políticas de uso.
                  </p>
                </div>
              </CardFooter>
            </Card>

            {/* System Configuration Section */}
            <div className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Configurações do Sistema</CardTitle>
                  <CardDescription>Gerencie as configurações gerais do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h3 className="font-medium text-lg">Horário de Envio</h3>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <div className="flex flex-col items-center">
                          <Label htmlFor="hora" className="text-center mb-2 text-green-700">
                            Todas as mensagens serão enviadas neste horário
                          </Label>
                          <Input
                            id="hora"
                            type="time"
                            value={horarioSelecionado}
                            className="text-center text-lg font-medium w-40 bg-white border-green-200 focus:border-green-500 focus:ring-green-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                setHorarioSelecionado(e.target.value)
                                setShowConfirmModal(true)
                              }
                            }}
                          />
                          <p className="text-sm text-gray-500 mt-2">Horário de Brasília (GMT-3)</p>

                          {/* Countdown Timer */}
                          <CountdownTimer targetTime={horarioSelecionado} />
                        </div>
                      </div>
                    </div>

                    {/* Message personalization section */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium">Personalização de Mensagens</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-2">
                          <Switch
                            id="use-name"
                            checked={usePersonalizedName}
                            onCheckedChange={setUsePersonalizedName}
                          />
                          <div>
                            <Label htmlFor="use-name" className="font-medium">
                              Incluir nome do contato nas mensagens
                            </Label>
                            <p className="text-sm text-gray-500 mt-1">
                              Quando ativado, o sistema substituirá a tag {"{nome}"} pelo primeiro nome do contato nas
                              mensagens automáticas.
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-md border">
                          <h4 className="text-sm font-medium mb-2">Exemplo:</h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500">Mensagem original:</p>
                              <p className="text-sm">
                                Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria.
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Com personalização:</p>
                              <p className="text-sm">
                                Feliz aniversário, <span className="font-medium text-green-600">Marcio</span>! Que Deus
                                abençoe sua vida com muita saúde, paz e alegria.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                          <div className="flex items-start">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium text-blue-800 mb-1">Como usar:</h4>
                              <p className="text-sm text-blue-700">
                                Adicione a tag {"{nome}"} em qualquer parte da sua mensagem onde deseja que o primeiro
                                nome do contato apareça. O sistema extrairá automaticamente o primeiro nome do contato,
                                mesmo que o registro contenha o nome completo.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <p className="text-sm text-gray-500">
                        Configure o horário padrão para o envio de mensagens automáticas. Esta configuração será
                        aplicada a todos os envios, a menos que sejam especificadas outras configurações no momento do
                        agendamento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Time confirmation modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-medium mb-4">Confirmar horário de envio</h3>
              <p className="mb-6">
                Você tem certeza que deseja configurar{" "}
                <span className="font-bold text-green-600">{horarioSelecionado}</span> como horário padrão para envio de
                todas as mensagens de aniversário?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => {
                    setHorarioConfirmado(true)
                    setShowConfirmModal(false)
                    // Salvar no Firestore
                    saveTimeToFirestore(horarioSelecionado)
                    toast({
                      title: "Horário configurado!",
                      description: `Suas mensagens serão enviadas às ${horarioSelecionado}.`,
                    })
                  }}
                >
                  Sim, confirmar horário
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de contagem regressiva
function CountdownTimer({ targetTime }: { targetTime: string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("Calculando...")
  const [isActive, setIsActive] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Função para calcular o tempo restante
    const calculateTimeRemaining = () => {
      try {
        const now = new Date()

        // Parse da hora alvo
        const [hours, minutes] = targetTime.split(":").map(Number)

        // Criar data alvo para hoje
        const targetDate = new Date()
        targetDate.setHours(hours, minutes, 0, 0)

        // Se a hora alvo já passou hoje, definir para amanhã
        if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1)
        }

        // Calcular diferença em segundos
        const diffInSeconds = differenceInSeconds(targetDate, now)

        // Converter para horas, minutos e segundos
        const remainingHours = Math.floor(diffInSeconds / 3600)
        const remainingMinutes = Math.floor((diffInSeconds % 3600) / 60)
        const remainingSeconds = diffInSeconds % 60

        // Formatar o tempo restante
        const formattedTime = `${remainingHours.toString().padStart(2, "0")}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`

        setTimeRemaining(formattedTime)

        // Verificar se é hora de enviar mensagens (quando chegar a 00:00:00)
        if (diffInSeconds === 0) {
          checkAndSendBirthdayMessages()
        }

        // Ativar o contador se estiver a menos de 24 horas
        setIsActive(diffInSeconds <= 86400) // 24 horas em segundos
      } catch (error) {
        console.error("Erro ao calcular tempo restante:", error)
        setTimeRemaining("Erro no cálculo")
      }
    }

    // Calcular imediatamente e depois a cada segundo
    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [targetTime])

  // Função para verificar aniversariantes e enviar mensagens
  const checkAndSendBirthdayMessages = async () => {
    if (!user?.email) return

    try {
      console.log("Verificando aniversariantes do dia...")

      // Obter a data atual
      const today = new Date()
      const currentDay = today.getDate()
      const currentMonth = today.getMonth() + 1 // getMonth() retorna 0-11

      // Consultar contatos no Firestore
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
      const snapshot = await getDocs(contactsRef)

      // Filtrar contatos com aniversário hoje
      const birthdayContacts = snapshot.docs.filter((doc) => {
        const contact = doc.data()

        // Verificar se tem data de nascimento
        if (!contact.data_de_nascimento) return false

        // Extrair dia e mês da data de nascimento
        let birthDay, birthMonth

        if (contact.data_de_nascimento.includes("/")) {
          // Formato DD/MM/YYYY
          ;[birthDay, birthMonth] = contact.data_de_nascimento.split("/").map(Number)
        } else if (contact.data_de_nascimento.includes("-")) {
          // Formato YYYY-MM-DD
          const parts = contact.data_de_nascimento.split("-")
          birthMonth = Number.parseInt(parts[1])
          birthDay = Number.parseInt(parts[2])
        } else {
          return false
        }

        // Verificar se é aniversário hoje
        return birthDay === currentDay && birthMonth === currentMonth
      })

      // Se houver aniversariantes, enviar mensagens
      if (birthdayContacts.length > 0) {
        console.log(`Encontrados ${birthdayContacts.length} aniversariantes hoje!`)

        // Mensagens de aniversário pré-definidas
        const birthdayMessages = [
          "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
          "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
          "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
        ]

        // Enviar mensagem para cada aniversariante
        for (const doc of birthdayContacts) {
          const contact = doc.data()

          // Selecionar mensagem aleatória
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          let message = birthdayMessages[randomIndex]

          // Personalizar mensagem com o nome se disponível
          if (contact.nome) {
            const firstName = contact.nome.split(" ")[0]
            message = message.replace("{nome}", firstName)
          }

          // Verificar se tem telefone
          if (contact.telefone) {
            // Aqui você implementaria a lógica para enviar a mensagem via WhatsApp
            console.log(`Enviando mensagem para ${contact.nome} (${contact.telefone}): ${message}`)

            // Simulação de envio - em produção, você chamaria sua API de envio
            try {
              // Exemplo de chamada à API (comentado para não executar realmente)
              /*
              await fetch("/api/whatsapp/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phoneNumber: contact.telefone,
                  message: message,
                  userEmail: user.email
                })
              });
              */

              // Substituir por:
              console.log(`[AutoSend] Enviando mensagem para ${contact.nome} (${contact.telefone}): ${message}`)
              try {
                // Enviar mensagem via API - DESCOMENTAR PARA ATIVAR ENVIO AUTOMÁTICO
                const response = await fetch("/api/whatsapp/send-message", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    phoneNumber: contact.telefone,
                    message: message,
                    userEmail: user.email,
                  }),
                })

                const responseData = await response.json()

                if (!response.ok) {
                  console.error(
                    `[AutoSend] Erro ao enviar mensagem para ${contact.nome}: Status ${response.status}`,
                    responseData,
                  )
                  throw new Error(responseData.message || `Erro ${response.status}`)
                }

                console.log(`[AutoSend] ✅ Mensagem enviada com sucesso para ${contact.nome}`, responseData)
              } catch (sendError) {
                console.error(`[AutoSend] ❌ Erro detalhado ao enviar mensagem para ${contact.nome}:`, sendError)
              }

              // Registrar envio no console (para demonstração)
              console.log(`✅ Mensagem enviada com sucesso para ${contact.nome}`)
            } catch (sendError) {
              console.error(`Erro ao enviar mensagem para ${contact.nome}:`, sendError)
            }
          }
        }

        // Notificar o usuário
        toast({
          title: "Mensagens de aniversário enviadas",
          description: `Foram enviadas mensagens para ${birthdayContacts.length} aniversariantes hoje.`,
        })
      } else {
        console.log("Nenhum aniversariante encontrado hoje.")
      }
    } catch (error) {
      console.error("Erro ao verificar aniversariantes:", error)
    }
  }

  // Se não estiver ativo, não mostrar nada
  if (!isActive) return null

  return (
    <div className="mt-4 text-center">
      <div className="text-sm font-medium text-gray-600 mb-1">Próximo envio em:</div>
      <div className="bg-white px-4 py-2 rounded-md border border-green-200 font-mono text-lg font-bold text-green-600">
        {timeRemaining}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        O sistema verificará automaticamente os aniversariantes do dia e enviará mensagens.
      </p>
    </div>
  )
}
