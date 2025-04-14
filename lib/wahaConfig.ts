// Arquivo: lib/wahaConfig.ts
// Vamos garantir que a configuração esteja correta

export const WAHA_CONFIG = {
  /**
   * A URL base da sua API WAHA, como ela é acessível externamente através do Nginx.
   * NÃO inclua a porta :3000 aqui, pois o Nginx está gerenciando isso.
   * Use HTTPS porque o Nginx está servindo um certificado SSL válido (Let's Encrypt).
   */
  API_URL: "https://api.parabenspravoce.com",

  /**
   * A chave de API secreta que você configurou no container Docker do WAHA.
   * Esta chave é necessária para autenticar todas as requisições.
   */
  API_KEY: "Cara2211Msa2013+ou-6",

  // Você pode adicionar outras configurações relacionadas ao WAHA aqui se precisar no futuro.
}

// Função auxiliar para obter a URL base da API WAHA
export const getWAHABaseURL = () => {
  return (
    process.env.WAHA_BASE_URL ||
    process.env.WAHA_API_URL ||
    process.env.NEXT_PUBLIC_WAHA_API_URL ||
    "https://api.parabenspravoce.com"
  )
}

// NOVA FUNÇÃO: Obter URL completa para endpoints de sessão
export const getSessionEndpointURL = (sessionName: string, endpoint: string) => {
  const baseURL = getWAHABaseURL()
  // Caminho correto: /api/sessions/[sessionName]/[endpoint]
  return `${baseURL}/api/sessions/${sessionName}/${endpoint}`
}
