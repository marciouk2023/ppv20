import { type NextRequest, NextResponse } from "next/server"
import { getWAHABaseURL } from "@/lib/wahaConfig"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, audioUrl, sessionName = "default" } = body

    if (!phoneNumber || !audioUrl) {
      return NextResponse.json(
        { success: false, message: "Número de telefone e URL do áudio são obrigatórios" },
        { status: 400 },
      )
    }

    // Formatar o número de telefone (remover espaços, traços, etc.)
    const formattedPhone = phoneNumber.replace(/\D/g, "")

    // Obter a URL base da API WAHA
    const wahaBaseURL = getWAHABaseURL()

    // Endpoint para enviar mensagem de voz
    const sendVoiceUrl = `${wahaBaseURL}/api/sendVoice`

    console.log(`[API Proxy /send-audio] Enviando áudio para ${formattedPhone} via sessão ${sessionName}`)

    // Preparar o payload conforme a documentação da API
    const payload = {
      chatId: `${formattedPhone}@c.us`,
      file: {
        mimetype: "audio/ogg; codecs=opus",
        url: audioUrl,
      },
      reply_to: null,
      session: sessionName,
    }

    // Fazer a requisição para a API WAHA
    const wahaResponse = await fetch(sendVoiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    // Verificar se a resposta foi bem-sucedida
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(`[API Proxy /send-audio] Erro da API WAHA (${wahaResponse.status}):`, errorText)

      let errorMessage = `Erro ao enviar áudio: ${wahaResponse.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        errorMessage = errorText
      }

      return NextResponse.json({ success: false, message: errorMessage }, { status: wahaResponse.status })
    }

    // Processar a resposta bem-sucedida
    const data = await wahaResponse.json()
    console.log(`[API Proxy /send-audio] Áudio enviado com sucesso:`, data)

    return NextResponse.json({
      success: true,
      message: "Áudio enviado com sucesso",
      data,
    })
  } catch (error) {
    console.error("[API Proxy /send-audio] Erro interno:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Erro ao processar envio de áudio: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      },
      { status: 500 },
    )
  }
}
