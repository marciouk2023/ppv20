// Caminho: app/api/sessions/[sessionName]/qrcode/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_CONFIG.API_URL || !WAHA_CONFIG.API_KEY) {
    console.error("[API Proxy /qr] Erro: WAHA API URL ou API Key não definida!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  const sessionName = params.sessionName // Nome completo vindo da URL (ex: session_123)
  if (!sessionName) {
    console.warn("[API Proxy /qr] Requisição sem sessionName na URL.")
    return NextResponse.json({ success: false, message: "sessionName obrigatório na URL." }, { status: 400 })
  }

  // Remove o prefixo 'session_' SE ele existir para usar na URL da API WAHA
  const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName

  try {
    // (Opcional: Mantendo a verificação de status, mas não é essencial para o QR)
    const statusUrl = `${WAHA_CONFIG.API_URL}/api/${wahaSessionName}`
    console.log(`[API Proxy /qr] Verificando status ANTES de pedir QR: GET ${statusUrl}`)
    try {
      const statusHeaders: HeadersInit = { Accept: "application/json", "X-Api-Key": WAHA_CONFIG.API_KEY }
      const statusWahaResponse = await fetch(statusUrl, {
        method: "GET",
        agent,
        headers: statusHeaders,
        cache: "no-store",
      })
      if (statusWahaResponse.ok) {
        const statusData = await statusWahaResponse.json()
        if (statusData?.status === "authenticated") {
          console.log(`[API Proxy /qr] Sessão '${wahaSessionName}' já está AUTENTICADA. Não precisa de QR.`)
          return NextResponse.json({ success: true, connected: true, message: "Session already authenticated" })
        }
      } else {
        console.warn(`[API Proxy /qr] Status check falhou (${statusWahaResponse.status}), continuando para QR...`)
      }
    } catch (statusError) {
      console.warn(`[API Proxy /qr] Erro no status check (${statusError}), continuando para QR...`)
    }

    // --- Obter o QR Code como IMAGEM ---
    // Monta a URL SEM o ?format=image (o header Accept deve ser suficiente)
    const qrUrl = `${WAHA_CONFIG.API_URL}/api/${wahaSessionName}/auth/qr`
    console.log(`[API Proxy /qr] Tentando obter QR code como IMAGEM: GET ${qrUrl}`)

    const qrHeaders: HeadersInit = {
      // <<< CORRIGIDO: Pedir image/png >>>
      Accept: "image/png",
      "User-Agent": BROWSER_USER_AGENT,
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }

    const qrWahaResponse = await fetch(qrUrl, {
      method: "GET",
      // @ts-ignore
      agent,
      headers: qrHeaders,
      cache: "no-store",
    })

    if (!qrWahaResponse.ok) {
      // Se falhar, tenta ler como texto para ver a mensagem de erro
      const errorText = await qrWahaResponse.text()
      console.error(
        `[API Proxy /qr] Erro da API WAHA (${qrWahaResponse.status}) ao pedir QR para '${wahaSessionName}': ${errorText}`,
      )
      let errorMessage = `WAHA API Error (${qrWahaResponse.status})`
      try {
        errorMessage = JSON.parse(errorText).message || errorText
      } catch (e) {
        errorMessage = errorText
      }
      if (qrWahaResponse.status === 409) {
        return NextResponse.json(
          { success: false, error: true, message: errorMessage, status: 409, needStatusCheck: true },
          { status: 409 },
        )
      }
      if (qrWahaResponse.status === 404) {
        errorMessage = `Sessão '${wahaSessionName}' não encontrada pela API WAHA ao pedir QR (404).`
      }
      return NextResponse.json({ success: false, message: errorMessage }, { status: qrWahaResponse.status })
    }

    // Se a resposta for OK (200), processa como imagem
    const contentType = qrWahaResponse.headers.get("content-type") || ""
    if (contentType.includes("image")) {
      console.log(
        `[API Proxy /qr] QR Code IMAGEM obtido com sucesso para '${wahaSessionName}' (Content-Type: ${contentType})`,
      )

      // Converte o corpo da resposta (imagem) para ArrayBuffer e depois para Base64
      const imageBuffer = await qrWahaResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")

      // Retorna o Base64 dentro de um JSON para o frontend
      return NextResponse.json({
        success: true,
        connected: false, // Precisa escanear
        // Adiciona o prefixo 'data:image/png;base64,' que o navegador precisa para exibir a imagem
        qrCode: `data:${contentType};base64,${base64Image}`,
      })
    } else {
      // Se a resposta foi OK mas não era imagem (inesperado)
      const responseText = await qrWahaResponse.text()
      console.error(
        `[API Proxy /qr] Resposta OK (${qrWahaResponse.status}) mas Content-Type inesperado: ${contentType}. Corpo: ${responseText}`,
      )
      return NextResponse.json(
        { success: false, message: "Resposta inesperada da API ao pedir QR code (não era imagem)." },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error(`[API Proxy /qr] Erro interno GRANDE na rota para ${params.sessionName}:`, error)
    return NextResponse.json(
      {
        message: "Internal Server Error processing QR request.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Método POST não permitido para esta rota. Use GET." }, { status: 405 })
}
