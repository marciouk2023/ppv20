// whatsappService.ts

import axios from "axios"

// Configurações
const CONFIG = {
  // Tempo máximo de espera para mudança de estado da sessão (ms)
  MAX_WAIT_TIME: 60000,
  // Intervalo de polling para verificar status (ms)
  POLLING_INTERVAL: 2000,
  // URL base da API - ajuste conforme necessário
  API_BASE_URL: "/api",
  // Estados esperados da sessão
  SESSION_STATES: {
    STARTING: "STARTING",
    SCAN_QR_CODE: "SCAN_QR_CODE",
    WORKING: "WORKING",
    CONNECTED: "CONNECTED",
    FAILED: "FAILED",
  },
  // Tempo de espera adicional após iniciar sessão
  INITIAL_DELAY: 3000,
}

// Classe para gerenciar erros específicos do WhatsApp
class WhatsAppServiceError extends Error {
  code: string | number
  details: any

  constructor(message: string, code: string | number, details: any = null) {
    super(message)
    this.name = "WhatsAppServiceError"
    this.code = code
    this.details = details
  }
}

/**
 * Serviço para gerenciar a integração com WhatsApp via WAHA API
 */
class WhatsAppService {
  apiBaseUrl: string
  sessionName: string | null
  userEmail: string | null
  onStatusChange: ((status: string, data?: any) => void) | null
  pollingTimer: NodeJS.Timeout | null
  currentStatus: string | null
  wasConnected: boolean

  constructor(apiBaseUrl = CONFIG.API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl
    this.sessionName = null
    this.userEmail = null
    this.onStatusChange = null
    this.pollingTimer = null
    this.currentStatus = null
    this.wasConnected = false
  }

  /**
   * Define a callback para mudanças de status
   * @param {Function} callback - Função a ser chamada quando o status mudar
   */
  setStatusChangeCallback(callback: (status: string, data?: any) => void) {
    this.onStatusChange = callback
  }

  /**
   * Atualiza o status atual e dispara callback se necessário
   * @param {string} status - Novo status
   * @param {object} data - Dados adicionais
   * @private
   */
  _updateStatus(status: string, data: any = {}) {
    if (this.currentStatus !== status) {
      this.currentStatus = status
      if (typeof this.onStatusChange === "function") {
        this.onStatusChange(status, data)
      }
    }
  }

  /**
   * Cria e retorna uma instância do cliente HTTP com configurações adequadas
   * @returns {object} Cliente HTTP configurado
   * @private
   */
  _createHttpClient() {
    const client = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
    })

    // Adicionar interceptores para tratamento de erros
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Formatação de erro para melhor diagnóstico
        const errorResponse = error.response || {}
        const status = errorResponse.status || "Network Error"
        const data = errorResponse.data || {}

        console.error(`WhatsApp API Error (${status}):`, data)

        return Promise.reject(new WhatsAppServiceError(data.message || error.message || "Unknown error", status, data))
      },
    )

    return client
  }

  /**
   * Inicia uma nova sessão do WhatsApp
   * @param {string} userEmail - Email do usuário
   * @param {string} sessionName - Nome da sessão (opcional)
   * @returns {Promise<object>} - Resultado da inicialização
   */
  async startSession(userEmail: string, sessionName: string | null = null) {
    const http = this._createHttpClient()

    // Gerar um nome de sessão único se não fornecido
    this.sessionName = sessionName || `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    this.userEmail = userEmail

    try {
      this._updateStatus("INITIALIZING")

      // 1. Iniciar a sessão no WAHA
      const sessionResponse = await http.post("/whatsapp/sessions", {
        sessionName: this.sessionName,
        userEmail: this.userEmail,
      })

      console.log("Session initialization response:", sessionResponse.data)

      // 2. Aguardar um momento para a sessão ser processada pelo servidor
      await new Promise((resolve) => setTimeout(resolve, CONFIG.INITIAL_DELAY))

      // 3. Iniciar polling para verificar o status da sessão
      return this._startPolling()
    } catch (error) {
      this._updateStatus("ERROR", { error })
      throw error
    }
  }

  /**
   * Inicia o polling para verificar o status da sessão
   * @returns {Promise<object>} - Promessa que resolve quando o QR code estiver disponível
   * @private
   */
  async _startPolling() {
    const http = this._createHttpClient()
    const startTime = Date.now()

    // Limpar qualquer polling anterior
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
    }

    // Função para verificar o status da sessão
    const checkSessionStatus = async () => {
      try {
        // Obter status atual da sessão
        const statusResponse = await http.get(`/whatsapp/sessions/${this.sessionName}/status`)
        const sessionData = statusResponse.data
        const sessionStatus = sessionData.status || CONFIG.SESSION_STATES.STARTING

        console.log(`Session status: ${sessionStatus}`)

        // Verificar se excedeu o tempo máximo de espera
        if (Date.now() - startTime > CONFIG.MAX_WAIT_TIME) {
          this._updateStatus("TIMEOUT")
          return { success: false, error: "Timeout while waiting for QR code" }
        }

        // Processar de acordo com o status da sessão
        switch (sessionStatus) {
          case CONFIG.SESSION_STATES.SCAN_QR_CODE:
            // QR Code está pronto - obter e retornar
            const qrResponse = await http.get(`/whatsapp/sessions/${this.sessionName}/auth/qr`)
            this._updateStatus("QR_READY", { qrCode: qrResponse.data })
            return { success: true, qrCode: qrResponse.data }

          case CONFIG.SESSION_STATES.CONNECTED:
          case CONFIG.SESSION_STATES.WORKING:
            // Já está conectado
            this.wasConnected = true
            this._updateStatus("CONNECTED")
            return { success: true, status: "CONNECTED" }

          case CONFIG.SESSION_STATES.FAILED:
            this._updateStatus("ERROR", { message: "Session failed" })
            return { success: false, error: "Session failed" }

          case CONFIG.SESSION_STATES.STARTING:
          default:
            // Ainda iniciando, continuar polling
            this._updateStatus("WAITING")

            // ESTRATÉGIA ALTERNATIVA:
            // Às vezes, o status pode ficar preso em "STARTING"
            // Tentar obter o QR Code diretamente se já esperar tempo suficiente
            if (Date.now() - startTime > CONFIG.INITIAL_DELAY * 2) {
              try {
                // Tentar obter QR code mesmo que status ainda seja STARTING
                const forceQrResponse = await http.get(`/whatsapp/sessions/${this.sessionName}/auth/qr`)
                if (forceQrResponse.data && forceQrResponse.status === 200) {
                  console.log("QR Code obtained despite session still STARTING")
                  this._updateStatus("QR_READY", { qrCode: forceQrResponse.data })
                  return { success: true, qrCode: forceQrResponse.data }
                }
              } catch (qrError) {
                // Ignorar erro, continuar polling
                console.log(
                  "Failed to force QR code while in STARTING state:",
                  qrError instanceof Error ? qrError.message : String(qrError),
                )
              }
            }

            // Agendar próxima verificação
            this.pollingTimer = setTimeout(() => checkSessionStatus(), CONFIG.POLLING_INTERVAL)
            return null // Ainda processando
        }
      } catch (error) {
        console.error("Error checking session status:", error)

        // Se já estava conectado antes, talvez seja apenas um erro temporário
        if (this.wasConnected) {
          this._updateStatus("CONNECTION_ISSUE", { error })
          this.pollingTimer = setTimeout(() => checkSessionStatus(), CONFIG.POLLING_INTERVAL)
          return null
        }

        this._updateStatus("ERROR", { error })
        return { success: false, error }
      }
    }

    // Iniciar o processo de polling
    return checkSessionStatus()
  }

  /**
   * Obtém uma screenshot da sessão atual (útil para diagnóstico)
   * @returns {Promise<string>} - URL da imagem (base64)
   */
  async getScreenshot() {
    if (!this.sessionName) {
      throw new WhatsAppServiceError("No active session", "NO_SESSION")
    }

    const http = this._createHttpClient()

    try {
      const response = await http.get(`/whatsapp/sessions/${this.sessionName}/screenshot`)
      return response.data
    } catch (error) {
      console.error("Error getting screenshot:", error)
      throw error
    }
  }

  /**
   * Encerra a sessão atual
   * @returns {Promise<object>} - Resultado do encerramento
   */
  async stopSession() {
    if (!this.sessionName) {
      return { success: true, message: "No session to stop" }
    }

    const http = this._createHttpClient()

    try {
      // Limpar polling
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer)
        this.pollingTimer = null
      }

      const response = await http.delete(`/whatsapp/sessions/${this.sessionName}`)
      this.sessionName = null
      this.userEmail = null
      this.currentStatus = null
      this.wasConnected = false

      return { success: true, data: response.data }
    } catch (error) {
      console.error("Error stopping session:", error)

      // Resetar de qualquer forma
      this.sessionName = null
      this.userEmail = null
      this.currentStatus = null
      this.wasConnected = false

      throw error
    }
  }
}

export default new WhatsAppService()
