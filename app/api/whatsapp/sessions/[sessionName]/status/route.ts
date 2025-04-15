// Caminho: app/api/whatsapp/sessions/[sessionName]/status/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionName: string } }, // sessionName aqui vem da URL, ex: session_12345
) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_CONFIG.API_URL || !WAHA_CONFIG.API_KEY) {
    console.error("[API /status] Erro: WAHA API URL ou API Key não definida!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  const sessionName = params.sessionName // Nome completo vindo da URL (ex: session_123)
  if (!sessionName) {
    console.warn("[API /status] Requisição sem sessionName na URL.")
    return NextResponse.json({ success: false, message: "sessionName obrigatório na URL." }, { status: 400 })
  }

  // Remove o prefixo 'session_' SE ele existir para usar na URL da API WAHA
  const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

  try {
    // Log usa o nome SEM prefixo agora
    console.log(`[API /status] Verificando status para sessão WAHA: ${wahaSessionName}`)

    // <<< CORRIGIDO: Usa wahaSessionName (SEM prefixo) na URL da API WAHA
    const wahaApiUrl = `${WAHA_CONFIG.API_URL}/api/sessions/${wahaSessionName}`
    console.log(`[API /status] Chamando WAHA API em: GET ${wahaApiUrl}`)

    const headers: HeadersInit = {
      Accept: "application/json",
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }
    console.log(`[API /status] Enviando requisição com X-Api-Key.`)

    const response = await fetch(wahaApiUrl, {
      method: "GET",
      // @ts-ignore
      agent,
      headers: headers,
      cache: "no-store",
    })

    const responseText = await response.text()

    // Resposta 404 AGORA significa que a sessão SEM prefixo não foi encontrada
    if (!response.ok) {
      console.error(
        `[API /status] Erro da API WAHA ao obter status (${response.status}) para '${wahaSessionName}': ${responseText}`,
      )
      let errorMessage = `WAHA API Error (${response.status})`
      try {
        errorMessage = JSON.parse(responseText).message || responseText
      } catch (e) {
        errorMessage = responseText
      }
      return NextResponse.json({ success: false, message: errorMessage }, { status: response.status })
    }

    const data = JSON.parse(responseText)
    console.log(
      `[API /status] Status obtido com sucesso (${response.status}) para sessão '${wahaSessionName}'. Estado: ${data?.status}`,
    )

    // Mapeia o status da API WAHA para o formato esperado pelo frontend
    let connected = false
    let authenticated = false
    let status = data?.status || "UNKNOWN" // Default status

    if (data?.engine?.state === "CONNECTED" || data?.status === "authenticated") {
      connected = true
      authenticated = true
      status = "CONNECTED"
    } else if (data?.status === "SCAN_QR_CODE") {
      status = "SCAN_QR_CODE"
    } else if (data?.status === "STARTING") {
      status = "STARTING"
    } else if (data?.status === "WORKING") {
      status = "WORKING"
    }

    return NextResponse.json({
      success: true,
      connected: connected,
      authenticated: authenticated,
      status: status,
      ...data,
    })
  } catch (error) {
    console.error(`[API /status] Erro interno ao buscar status para ${wahaSessionName}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro interno no servidor: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      },
      { status: 500 },
    )
  }
}
