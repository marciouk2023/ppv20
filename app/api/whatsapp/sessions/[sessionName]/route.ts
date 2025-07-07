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
    // Log detalhado para debug
    console.log(`[API /status] Verificando status para sessão original: ${sessionName}, WAHA: ${wahaSessionName}`)

    // <<< CORRIGIDO: Usa wahaSessionName (SEM prefixo) na URL da API WAHA
    const wahaApiUrl = `${WAHA_CONFIG.API_URL}/api/sessions/${wahaSessionName}`
    console.log(`[API /status] Chamando WAHA API em: GET ${wahaApiUrl}`)

    const headers: HeadersInit = {
      Accept: "application/json",
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }
    console.log(`[API /status] Enviando requisição para WAHA com X-Api-Key.`)

    const response = await fetch(wahaApiUrl, {
      method: "GET",
      // @ts-ignore
      agent,
      headers: headers,
      cache: "no-store",
    })

    const responseText = await response.text()
    console.log(`[API /status] Resposta bruta da API WAHA (${response.status}): ${responseText.substring(0, 100)}...`)

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

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error(`[API /status] Erro ao parsear resposta JSON: ${e}. Texto: ${responseText}`)
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao parsear resposta da API WAHA",
        },
        { status: 500 },
      )
    }

    console.log(
      `[API /status] Status obtido com sucesso (${response.status}) para sessão '${wahaSessionName}'. Estado: ${data?.status || data?.engine?.state || "desconhecido"}`,
    )

    // Mapeia o status da API WAHA para o formato esperado pelo frontend
    let connected = false
    let authenticated = false
    let status = data?.status || "UNKNOWN" // Default status

    // >>> TRATE WORKING COMO PRONTO <<<
    if (data?.status === "WORKING") {
      connected = true
      authenticated = true
      status = "CONNECTED"
    }
    // Outros casos de status conectado
    else if (data?.engine?.state === "CONNECTED" || data?.status === "authenticated") {
      connected = true
      authenticated = true
      status = "CONNECTED"
    } else if (data?.status === "SCAN_QR_CODE") {
      status = "SCAN_QR_CODE"
    } else if (data?.status === "STARTING") {
      status = "STARTING"
    }

    // Log adicional para debug do mapeamento
    console.log(
      `[API /status] Status mapeado: original=${data?.status}, engine=${data?.engine?.state} → final=${status} (connected=${connected}, authenticated=${authenticated})`,
    )

    const output = {
      success: true,
      connected,
      authenticated,
      status, // == "CONNECTED" quando for WORKING
      originalStatus: data?.status,
      engineState: data?.engine?.state,
      // Adicionando apenas campos específicos que possam ser necessários
      qrCode: data?.qrCode,
      name: data?.name,
      description: data?.description,
      // Se você precisar de outras props de `data`, liste-as aqui explicitamente
    }
    return NextResponse.json(output)
  } catch (error) {
    console.error(`[API /status] Erro interno ao buscar status para ${wahaSessionName}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no servidor ao buscar status.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Adiciona handlers para outros métodos para evitar erros 405
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Método POST não permitido para esta rota. Use GET." }, { status: 405 })
}
