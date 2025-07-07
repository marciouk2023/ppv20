import { type NextRequest, NextResponse } from "next/server"

// Lê a URL e a Chave do ambiente (disponível apenas no backend)
const WAHA_API_URL = process.env.WAHA_API_URL
const WAHA_API_KEY = process.env.WAHA_API_KEY

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  // Verifica se a URL base da API WAHA foi configurada
  if (!WAHA_API_URL) {
    console.error("[API Proxy /api/whatsapp/sessions/[sessionName]/qr] Erro: WAHA_API_URL não está configurada")
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

    console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/qr] Solicitando QR code`)

    // Prepara os cabeçalhos para a chamada à API WAHA
    const headers: HeadersInit = {
      Accept: "application/json",
    }

    // Adiciona cabeçalho de autenticação se a chave estiver definida
    if (WAHA_API_KEY) {
      headers["Authorization"] = `Bearer ${WAHA_API_KEY}` // Using Bearer authentication
      console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/qr] Enviando requisição com chave de API`)
    }

    // Define a URL para obter o QR code da sessão
    const wahaEndpoint = `${WAHA_API_URL}/api/sessions/${sessionName}/qr`
    console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/qr] Chamando WAHA: GET ${wahaEndpoint}`)

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
        `[API Proxy /api/whatsapp/sessions/${sessionName}/qr] Erro da API WAHA (${wahaResponse.status}):`,
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
    console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/qr] QR code obtido com sucesso`)

    // Verifica se a sessão já está conectada
    if (data.connected) {
      console.log(`[API Proxy /api/whatsapp/sessions/${sessionName}/qr] Sessão já está conectada`)
      return NextResponse.json({ connected: true })
    }

    // Retorna o QR code
    return NextResponse.json(data)
  } catch (error) {
    console.error(`[API Proxy /api/whatsapp/sessions/[sessionName]/qr] Erro interno:`, error)
    return NextResponse.json(
      {
        message: "Erro interno ao processar solicitação de QR code",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
