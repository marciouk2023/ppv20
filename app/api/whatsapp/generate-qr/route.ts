import { NextResponse } from "next/server"
import { WAHA_CONFIG } from "@/lib/wahaConfig"
import { saveUserSession } from "@/lib/session-manager"
import https from "https"

export async function POST(request: Request) {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false })
    const data = await request.json()
    const { sessionName, userEmail } = data

    if (!sessionName) {
      return NextResponse.json({ success: false, error: "Nome da sessão não fornecido" }, { status: 400 })
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Email do usuário não fornecido" }, { status: 400 })
    }

    console.log(`[API /generate-qr] Iniciando sessão: ${sessionName} para usuário: ${userEmail}`)

    // Remover o prefixo "session_" se existir
    const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

    // 1. Iniciar a sessão na API WAHA
    const startSessionUrl = `${WAHA_CONFIG.API_URL}/api/sessions/start`
    console.log(`[API /generate-qr] Chamando API para iniciar sessão: POST ${startSessionUrl}`)

    const startResponse = await fetch(startSessionUrl, {
      method: "POST",
      // @ts-ignore
      agent,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_CONFIG.API_KEY,
      },
      body: JSON.stringify({
        name: wahaSessionName, // Enviar sem o prefixo
      }),
    })

    if (!startResponse.ok) {
      const errorText = await startResponse.text()
      console.error(`[API /generate-qr] Erro ao iniciar sessão (${startResponse.status}): ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Erro ao iniciar sessão: ${errorText}` },
        { status: startResponse.status },
      )
    }

    // 2. Salvar a associação do usuário com a sessão
    await saveUserSession(userEmail, sessionName, "STARTING")
    console.log(`[API /generate-qr] Sessão ${sessionName} associada ao usuário ${userEmail}`)

    // 3. Obter o QR code
    // Aguardar um pouco para a sessão iniciar
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const qrUrl = `${WAHA_CONFIG.API_URL}/api/${wahaSessionName}/auth/qr`
    console.log(`[API /generate-qr] Obtendo QR code: GET ${qrUrl}`)

    const qrResponse = await fetch(qrUrl, {
      method: "GET",
      // @ts-ignore
      agent,
      headers: {
        Accept: "image/png",
        "X-Api-Key": WAHA_CONFIG.API_KEY,
      },
    })

    // Se a sessão já estiver conectada, retornar essa informação
    if (qrResponse.status === 409 || qrResponse.status === 422) {
      console.log(`[API /generate-qr] Sessão ${wahaSessionName} já está conectada ou em uso`)
      return NextResponse.json({
        success: true,
        status: "CONNECTED",
        message: "Sessão já está conectada ou em uso",
      })
    }

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text()
      console.error(`[API /generate-qr] Erro ao obter QR code (${qrResponse.status}): ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Erro ao obter QR code: ${errorText}` },
        { status: qrResponse.status },
      )
    }

    // Verificar se a resposta é uma imagem
    const contentType = qrResponse.headers.get("content-type") || ""
    if (contentType.includes("image")) {
      console.log(`[API /generate-qr] QR code obtido com sucesso como imagem`)

      // Converter para base64
      const imageBuffer = await qrResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")

      return NextResponse.json({
        success: true,
        qrCode: `data:${contentType};base64,${base64Image}`,
        sessionName: sessionName,
      })
    } else {
      // Se não for imagem, tentar processar como JSON
      const responseText = await qrResponse.text()
      console.log(`[API /generate-qr] Resposta não é imagem: ${responseText}`)

      try {
        const jsonData = JSON.parse(responseText)
        return NextResponse.json({
          success: true,
          ...jsonData,
          sessionName: sessionName,
        })
      } catch (e) {
        return NextResponse.json(
          {
            success: false,
            error: "Resposta inesperada ao obter QR code",
            rawResponse: responseText,
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error("Erro ao gerar QR code:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 },
    )
  }
}
