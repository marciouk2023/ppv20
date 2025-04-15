import { type NextRequest, NextResponse } from "next/server"

// Lê a URL e a Chave do ambiente (disponível apenas no backend)
const WAHA_API_URL = process.env.WAHA_API_URL
const WAHA_API_KEY = process.env.WAHA_API_KEY

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  // Verifica se a URL base da API WAHA foi configurada
  if (!WAHA_API_URL) {
    console.error("[API Proxy /api/whatsapp/sessions/[sessionName]/status] Erro: WAHA_API_URL não está configurada")
    return NextResponse.json(
      { message: "Configuração interna do servidor incompleta: WAHA API URL não definida." },
      { status: 500 },
    )
  }

  try {
    const { sessionName } = params

    if (!sessionName) {
      return NextResponse.json({ message: "Nome da sessão não fornecido na URL" }, { status: 400 })
    }

    console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/status] Verificando status da sessão`)

    // Prepara os cabeçalhos para a chamada à API WAHA
    const headers: HeadersInit = {
      Accept: "application/json",
    }

    // Adiciona cabeçalho de autenticação se a chave estiver definida
    if (WAHA_API_KEY) {
      headers["Authorization"] = `Bearer ${WAHA_API_KEY}` // Using Bearer authentication
      console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/status] Enviando requisição com chave de API`)
    }

    // Define a URL para verificar o status da sessão
    const wahaEndpoint = `${WAHA_API_URL}/api/sessions/${sessionName}`
    console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/status] Chamando WAHA: GET ${wahaEndpoint}`)

    // Faz a chamada fetch para a API WAHA
    const wahaResponse = await fetch(wahaEndpoint, {
      method: "GET",
      headers: headers,
      cache: "no-store", // Não usar cache para esta operação
    })

    // Se a resposta não for OK, trata como erro
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(
        `[API Proxy /api/whatsapp/sessions/${sessionName}/status] Erro da API WAHA (${wahaResponse.status}):`,
        errorText,
      )

      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        errorMessage = errorText
      }

      return NextResponse.json({ message: errorMessage }, { status: wahaResponse.status })
    }

    // Processa a resposta bem-sucedida
    const data = await wahaResponse.json()
    console.log(
      `[API Proxy /api/whatsapp/sessions/${sessionName}/status] Status obtido com sucesso:`,
      data.state ? `Estado: ${data.state}` : "Formato de resposta inesperado",
    )

    // Mapeia a resposta da API WAHA para um formato mais simples para o frontend
    return NextResponse.json({
      connected: data.state === "CONNECTED",
      authenticated: data.state === "CONNECTED" || data.state === "AUTHENTICATED",
      state: data.state,
      // Inclui outros dados relevantes da resposta
      ...data,
    })
  } catch (error) {
    console.error(`[API Proxy /api/whatsapp/sessions/[sessionName]/status] Erro interno:`, error)
    return NextResponse.json(
      {
        message: "Erro interno ao verificar status da sessão",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
