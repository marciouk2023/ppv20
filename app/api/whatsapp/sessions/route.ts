// Caminho: app/api/whatsapp/sessions/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

const WAHA_API_URL = WAHA_CONFIG.API_URL
const WAHA_API_KEY = WAHA_CONFIG.API_KEY

export async function POST(request: NextRequest) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_API_URL || !WAHA_API_KEY) {
    console.error("[API /sessions] Erro: WAHA API URL ou API Key não definida na configuração!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const sessionName = body.sessionName // Ex: session_12345
    const userEmail = body.userEmail

    if (!sessionName) {
      console.warn("[API /sessions] Requisição recebida sem sessionName.")
      return NextResponse.json(
        { success: false, message: "Session name (sessionName) é obrigatório no corpo da requisição." },
        { status: 400 },
      )
    }

    // <<< IMPORTANTE: Usa o nome da sessão SEM o prefixo para o corpo da requisição do WAHA >>>
    const wahaSessionNameToCreate = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

    console.log(
      `[API /sessions] Recebida requisição para iniciar/criar sessão: ${sessionName} (WAHA name: ${wahaSessionNameToCreate}) para usuário: ${userEmail || "desconhecido"}`,
    )

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": WAHA_API_KEY,
    }
    console.log(`[API /sessions] Enviando requisição para WAHA com X-Api-Key.`)

    const requestBody = {
      name: wahaSessionNameToCreate, // Envia o nome SEM prefixo para o WAHA criar/iniciar
    }

    // Certifique-se de que a URL está correta
    const wahaEndpoint = `${WAHA_API_URL}/api/sessions/${wahaSessionNameToCreate}`
    console.log(`[API /sessions] Chamando WAHA: POST ${wahaEndpoint} com body:`, JSON.stringify(requestBody))

    const wahaResponse = await fetch(wahaEndpoint, {
      method: "POST",
      // @ts-ignore
      agent,
      headers: headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    const responseText = await wahaResponse.text()

    if (!wahaResponse.ok) {
      console.error(
        `[API /sessions] Erro da API WAHA (<span class="math-inline">\{wahaResponse\.status\}\) para iniciar '</span>{wahaSessionNameToCreate}': ${responseText}`,
      )
      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        errorMessage = JSON.parse(responseText).message || responseText
      } catch (e) {
        errorMessage = responseText
      }
      return NextResponse.json({ success: false, message: errorMessage }, { status: wahaResponse.status })
    }

    console.log(
      `[API /sessions] Resposta OK (<span class="math-inline">\{wahaResponse\.status\}\) da WAHA para iniciar/criar '</span>{wahaSessionNameToCreate}'. Resposta: ${responseText}`,
    )
    let responseData = {}
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }

    // Retorna sucesso e o NOME COMPLETO (com prefixo) para o frontend usar nas próximas chamadas
    return NextResponse.json({
      success: true,
      message: "Pedido de início de sessão enviado com sucesso para WAHA.",
      sessionName: sessionName, // Retorna o nome original com prefixo
      data: responseData,
      userEmail: userEmail,
    })
  } catch (error) {
    console.error("[API /sessions] Erro interno na rota:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no servidor ao processar pedido de sessão.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  console.log("[API /sessions] Recebido GET request (não permitido).")
  return NextResponse.json({ message: "Método GET não permitido para esta rota. Use POST." }, { status: 405 })
}
