import { type NextRequest, NextResponse } from "next/server"

const WAHA_API_URL = process.env.WAHA_API_URL
// Não usaremos chave API aqui baseado na documentação do GET /api/sessions/{session}
// const WAHA_API_KEY = process.env.WAHA_API_KEY;

// Handler para o método GET
export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  // Verifica configuração
  if (!WAHA_API_URL) {
    console.error("[API Proxy /status] Erro: WAHA_API_URL não está configurada.")
    return NextResponse.json(
      { message: "Configuração interna do servidor incompleta: WAHA API URL não definida." },
      { status: 500 },
    )
  }

  // Pega o nome da sessão do parâmetro da URL
  const sessionName = params.sessionName
  if (!sessionName) {
    console.warn("[API Proxy /status] Requisição GET recebida sem sessionName na URL.")
    return NextResponse.json({ message: "O parâmetro sessionName é obrigatório na URL." }, { status: 400 })
  }

  try {
    // Monta a URL para o endpoint de status da API WAHA, conforme documentação
    const statusUrl = `${WAHA_API_URL}/api/sessions/${sessionName}` // Endpoint confirmado!
    console.log(`[API Proxy /status] Chamando WAHA: GET ${statusUrl}`)

    // Prepara cabeçalhos
    const headers: HeadersInit = {
      Accept: "application/json", // Esperamos uma resposta JSON
    }
    // Sem autenticação aqui

    // Faz a chamada fetch para a API WAHA
    const wahaResponse = await fetch(statusUrl, {
      method: "GET", // Confirmado!
      headers: headers,
      cache: "no-store", // Não usar cache
    })

    // Se a API WAHA não encontrar a sessão
    if (wahaResponse.status === 404) {
      console.warn(`[API Proxy /status] WAHA respondeu 404 para '${sessionName}' (Sessão não encontrada).`)
      // Retorna um status específico para o frontend saber que não achou
      return NextResponse.json(
        {
          success: false,
          connected: false,
          authenticated: false,
          status: "NOT_FOUND",
          message: "Session not found by WAHA API",
        },
        { status: 404 },
      )
    }

    // Outros erros da API WAHA
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(`[API Proxy /status] Erro da API WAHA (${wahaResponse.status}) para '${sessionName}':`, errorText)
      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        errorMessage = JSON.parse(errorText).message || errorText
      } catch (e) {
        errorMessage = errorText
      }
      // Retorna o erro para o frontend, mantendo o status original
      return NextResponse.json(
        { message: errorMessage, success: false, connected: false, authenticated: false, status: "API_ERROR" },
        { status: wahaResponse.status },
      )
    }

    // Se a resposta for OK, processa o JSON
    const data = await wahaResponse.json()

    // Verifica conexão baseado na documentação: data.engine.state === "CONNECTED"
    let isConnected = false
    let isAuthenticated = false

    if (data?.engine?.state === "CONNECTED") {
      // <-- Verificação confirmada!
      isConnected = true
      // Consideramos autenticado se estiver conectado E tiver informações do usuário ('me')
      if (data.me && data.me.id) {
        isAuthenticated = true
      }
    }
    console.log(
      `[API Proxy /status] Status WAHA para '${sessionName}': engine.state=${data?.engine?.state}, me=${!!data?.me}. Conectado=${isConnected}, Autenticado=${isAuthenticated}`,
    )

    // Retorna o status processado para o frontend
    return NextResponse.json({
      success: true,
      connected: isConnected,
      authenticated: isAuthenticated,
      status: data?.status || "UNKNOWN", // Status geral (WORKING, SCAN_QR_CODE, etc.)
      engine_state: data?.engine?.state, // Estado específico (pode ser útil para debug no frontend)
      me: data?.me, // Informações do usuário conectado (pode ser útil no frontend)
    })

    // Tratamento de erro geral (falha na rede, erro ao parsear JSON, etc.)
  } catch (error) {
    console.error(`[API Proxy /status] Erro interno na rota para ${sessionName}:`, error)
    // Retorna um erro genérico 500 para o frontend
    return NextResponse.json(
      {
        success: false,
        connected: false,
        authenticated: false,
        status: "INTERNAL_ERROR",
        message: "Internal Server Error processing status request.",
      },
      { status: 500 },
    )
  }
}

// Adiciona handlers para outros métodos para evitar erros 405
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Método POST não permitido para esta rota. Use GET." }, { status: 405 })
}
// Adicione PUT, DELETE etc. se quiser ser mais completo
