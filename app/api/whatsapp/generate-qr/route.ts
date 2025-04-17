import { NextResponse } from "next/server"
import { saveUserSession } from "@/lib/session-manager"

// Lê a URL e a Chave do ambiente (disponível apenas no backend)
const WAHA_API_URL = process.env.WAHA_API_URL
const WAHA_API_KEY = process.env.WAHA_API_KEY

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json()
    const { sessionName, userEmail } = body

    if (!sessionName) {
      return NextResponse.json({ success: false, message: "Nome da sessão não fornecido" }, { status: 400 })
    }

    // Verifica se a URL base da API WAHA foi configurada
    if (!WAHA_API_URL) {
      console.error("[API Proxy /api/whatsapp/generate-qr] Erro: WAHA_API_URL não está configurada")
      return NextResponse.json(
        { success: false, message: "Configuração interna do servidor incompleta: WAHA API URL não definida." },
        { status: 500 },
      )
    }

    console.log(`[API Proxy /api/whatsapp/generate-qr] Iniciando sessão: ${sessionName}`)

    // Prepara os cabeçalhos para a chamada à API WAHA
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    // Adiciona cabeçalho de autenticação se a chave estiver definida
    if (WAHA_API_KEY) {
      headers["Authorization"] = `Bearer ${WAHA_API_KEY}`
      console.log(`[API Proxy /api/whatsapp/generate-qr] Enviando requisição com chave de API`)
    }

    // Define a URL para iniciar a sessão
    const wahaEndpoint = `${WAHA_API_URL}/api/sessions/start`
    console.log(`[API Proxy /api/whatsapp/generate-qr] Chamando WAHA: POST ${wahaEndpoint}`)

    // Faz a chamada fetch para a API WAHA
    const wahaResponse = await fetch(wahaEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ name: sessionName }),
      cache: "no-store", // Não usar cache para esta operação
    })

    // Se a resposta não for OK, trata como erro
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(`[API Proxy /api/whatsapp/generate-qr] Erro da API WAHA (${wahaResponse.status}):`, errorText)

      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        errorMessage = errorText
      }

      return NextResponse.json({ success: false, message: errorMessage }, { status: wahaResponse.status })
    }

    // Processa a resposta bem-sucedida
    const startSessionData = await wahaResponse.json()
    console.log(`[API Proxy /api/whatsapp/generate-qr] Sessão iniciada com sucesso: ${sessionName}`)

    // Agora, obtenha o QR code para a sessão
    const qrEndpoint = `${WAHA_API_URL}/api/sessions/${sessionName}/qr`
    console.log(`[API Proxy /api/whatsapp/generate-qr] Obtendo QR code: GET ${qrEndpoint}`)

    const qrResponse = await fetch(qrEndpoint, {
      method: "GET",
      headers: headers,
      cache: "no-store",
    })

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text()
      console.error(`[API Proxy /api/whatsapp/generate-qr] Erro ao obter QR code (${qrResponse.status}):`, errorText)

      let errorMessage = `WAHA API Error (${qrResponse.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        errorMessage = errorText
      }

      return NextResponse.json({ success: false, message: errorMessage }, { status: qrResponse.status })
    }

    const qrData = await qrResponse.json()
    console.log(`[API Proxy /api/whatsapp/generate-qr] QR code obtido com sucesso para sessão: ${sessionName}`)

    // Se o usuário foi fornecido, salve a associação no Firestore
    if (userEmail) {
      await saveUserSession(userEmail, sessionName)
      console.log(`[API Proxy /api/whatsapp/generate-qr] Associação de sessão salva para usuário: ${userEmail}`)
    }

    // Retorna os dados combinados
    return NextResponse.json({
      success: true,
      sessionName,
      ...qrData,
    })
  } catch (error) {
    console.error(`[API Proxy /api/whatsapp/generate-qr] Erro interno:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao processar solicitação de QR code",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
