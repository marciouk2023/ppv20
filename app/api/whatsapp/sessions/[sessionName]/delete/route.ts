// Caminho: app/api/whatsapp/sessions/[sessionName]/delete/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

export async function DELETE(request: NextRequest, { params }: { params: { sessionName: string } }) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_CONFIG.API_URL || !WAHA_CONFIG.API_KEY) {
    console.error("[API /sessions/delete] Erro: WAHA API URL ou API Key não definida!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  const sessionName = params.sessionName
  if (!sessionName) {
    console.warn("[API /sessions/delete] Requisição sem sessionName na URL.")
    return NextResponse.json({ success: false, message: "sessionName obrigatório na URL." }, { status: 400 })
  }

  // Remove o prefixo 'session_' SE ele existir para usar na URL da API WAHA
  const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

  try {
    console.log(`[API /sessions/delete] Excluindo sessão: ${wahaSessionName}`)

    const headers: HeadersInit = {
      Accept: "application/json",
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }

    // Endpoint para excluir a sessão
    const wahaEndpoint = `${WAHA_CONFIG.API_URL}/api/sessions/${wahaSessionName}`
    console.log(`[API /sessions/delete] Chamando WAHA: DELETE ${wahaEndpoint}`)

    const wahaResponse = await fetch(wahaEndpoint, {
      method: "DELETE",
      // @ts-ignore
      agent,
      headers: headers,
      cache: "no-store",
    })

    // Mesmo que a resposta não seja OK, consideramos a operação bem-sucedida
    // pois o objetivo é remover a sessão
    if (!wahaResponse.ok) {
      console.warn(
        `[API /sessions/delete] Aviso: Resposta não-OK (${wahaResponse.status}) ao excluir sessão '${wahaSessionName}'`,
      )
    }

    // Tentar ler a resposta como texto
    let responseText = ""
    try {
      responseText = await wahaResponse.text()
    } catch (e) {
      responseText = "Não foi possível ler a resposta"
    }

    console.log(
      `[API /sessions/delete] Sessão '${wahaSessionName}' excluída com status ${wahaResponse.status}. Resposta: ${responseText}`,
    )

    // Retornar sucesso mesmo se a API WAHA retornar erro
    // pois a sessão pode não existir mais de qualquer forma
    return NextResponse.json({
      success: true,
      message: `Sessão ${wahaSessionName} excluída ou já não existe`,
      wahaStatus: wahaResponse.status,
    })
  } catch (error) {
    console.error(`[API /sessions/delete] Erro interno ao excluir sessão '${wahaSessionName}':`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao processar exclusão de sessão",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
