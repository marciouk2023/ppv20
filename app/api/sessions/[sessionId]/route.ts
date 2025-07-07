import { type NextRequest, NextResponse } from "next/server"
import https from "https"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail } = body

    console.log(`[API] Creating or retrieving session for user: ${userEmail}`)

    // Criar um agente HTTPS que ignora erros de certificado
    const agent = new https.Agent({
      rejectUnauthorized: false,
    })

    // Tentar obter sessão existente ou criar nova na API WAHA
    const sessionResponse = await fetch("https://api.parabenspravoce.com/api/sessions", {
      method: "GET",
      // @ts-ignore
      agent,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "Cara2211Msa2013+ou-6",
      },
    })

    const sessions = await sessionResponse.json()

    // Verificar se já existe uma sessão
    let sessionId = ""
    if (sessions && sessions.length > 0) {
      sessionId = sessions[0].id
      console.log(`[API] Found existing session: ${sessionId}`)
    } else {
      // Criar nova sessão
      const createResponse = await fetch("https://api.parabenspravoce.com/api/sessions", {
        method: "POST",
        // @ts-ignore
        agent,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "Cara2211Msa2013+ou-6",
        },
        body: JSON.stringify({
          name: "default",
        }),
      })

      const newSession = await createResponse.json()
      sessionId = newSession.id
      console.log(`[API] Created new session: ${sessionId}`)
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
    })
  } catch (error) {
    console.error("[API] Error managing session:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao gerenciar sessão: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      },
      { status: 500 },
    )
  }
}
