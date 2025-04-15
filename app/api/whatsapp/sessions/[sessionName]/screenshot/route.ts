// Caminho: app/api/whatsapp/sessions/[sessionName]/screenshot/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_CONFIG.API_URL || !WAHA_CONFIG.API_KEY) {
    console.error("[API /screenshot] Erro: WAHA API URL ou API Key não definida!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  const sessionName = params.sessionName
  if (!sessionName) {
    console.warn("[API /screenshot] Requisição sem sessionName na URL.")
    return NextResponse.json({ success: false, message: "sessionName obrigatório na URL." }, { status: 400 })
  }

  // Remove o prefixo 'session_' SE ele existir para usar na URL da API WAHA
  const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

  try {
    console.log(`[API /screenshot] Obtendo screenshot para sessão: ${wahaSessionName}`)

    const headers: HeadersInit = {
      Accept: "image/png",
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }

    // Endpoint para obter screenshot
    const wahaEndpoint = `${WAHA_CONFIG.API_URL}/api/screenshot?session=${wahaSessionName}`
    console.log(`[API /screenshot] Chamando WAHA: GET ${wahaEndpoint}`)

    const wahaResponse = await fetch(wahaEndpoint, {
      method: "GET",
      // @ts-ignore
      agent,
      headers: headers,
      cache: "no-store",
    })

    if (!wahaResponse.ok) {
      console.error(
        `[API /screenshot] Erro da API WAHA (${wahaResponse.status}) ao obter screenshot para '${wahaSessionName}'`,
      )

      // Tentar ler a resposta como texto para diagnóstico
      let errorText = ""
      try {
        errorText = await wahaResponse.text()
      } catch (e) {
        errorText = "Não foi possível ler a resposta de erro"
      }

      return NextResponse.json(
        {
          success: false,
          message: `Erro ao obter screenshot: ${wahaResponse.status}`,
          details: errorText,
        },
        { status: wahaResponse.status },
      )
    }

    // Verificar se a resposta é uma imagem
    const contentType = wahaResponse.headers.get("content-type") || ""
    if (contentType.includes("image")) {
      console.log(`[API /screenshot] Screenshot obtido com sucesso para '${wahaSessionName}'`)

      // Converter para base64
      const imageBuffer = await wahaResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")

      return NextResponse.json({
        success: true,
        screenshot: `data:${contentType};base64,${base64Image}`,
      })
    } else {
      // Se não for imagem, tentar processar como JSON ou texto
      const responseText = await wahaResponse.text()
      console.log(`[API /screenshot] Resposta não é imagem: ${responseText}`)

      try {
        const jsonData = JSON.parse(responseText)
        return NextResponse.json({
          success: true,
          data: jsonData,
        })
      } catch (e) {
        return NextResponse.json(
          {
            success: false,
            message: "Resposta inesperada ao obter screenshot",
            rawResponse: responseText,
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error(`[API /screenshot] Erro interno ao obter screenshot para '${wahaSessionName}':`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao processar solicitação de screenshot",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
