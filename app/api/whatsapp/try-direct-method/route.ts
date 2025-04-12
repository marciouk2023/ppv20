// app/api/whatsapp/try-direct-method/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { getWAHABaseURL } from "@/lib/wahaConfig"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { phone, audioUrl } = data

    // URL da API WAHA para envio direto de mensagem
    const wahaBaseURL = getWAHABaseURL()
    const wahaEndpoint = `${wahaBaseURL}/api/sendText`

    // Enviar mensagem com a URL do áudio
    const wahaBody = {
      chatId: `${phone}@c.us`,
      text: `Não consegui enviar o áudio automaticamente. Aqui está o link: ${audioUrl}`,
      session: "default",
    }

    const wahaResponse = await fetch(wahaEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wahaBody),
    })

    const result = await wahaResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao processar solicitação",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 },
    )
  }
}
