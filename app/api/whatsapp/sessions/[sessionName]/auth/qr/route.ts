import { type NextRequest, NextResponse } from "next/server"
import { WAHA_CONFIG } from "@/lib/wahaConfig" // Ajuste o caminho se necessário

const WAHA_API_URL = WAHA_CONFIG.API_URL
const WAHA_API_KEY = WAHA_CONFIG.API_KEY
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  if (!WAHA_API_URL) {
    console.error("[API Proxy /qr] Erro: WAHA API URL não definida!")
    return NextResponse.json({ message: "Configuração interna: WAHA API URL não definida." }, { status: 500 })
  }

  const sessionName = params.sessionName
  if (!sessionName) {
    console.warn("[API Proxy /qr] Requisição sem sessionName.")
    return NextResponse.json({ message: "sessionName obrigatório na URL." }, { status: 400 })
  }

  try {
    // --- PASSO 1: Verificar o Status da Sessão Primeiro ---
    const statusUrl = sessionName.startsWith("session_")
      ? `${WAHA_API_URL}/api/session_${sessionName.substring(8)}`
      : `${WAHA_API_URL}/api/session_${sessionName}`
    console.log(`[API Proxy /qr] PASSO 1: Verificando status ANTES de pedir QR: GET ${statusUrl}`)

    try {
      const statusHeaders: HeadersInit = { Accept: "application/json" }
      // Adicionar Auth Key aqui se o endpoint de status precisar (verificar documentação)
      if (WAHA_API_KEY) {
        statusHeaders["Authorization"] = `Bearer ${WAHA_API_KEY}`
      }

      const statusWahaResponse = await fetch(statusUrl, {
        method: "GET",
        headers: statusHeaders,
        cache: "no-store",
      })

      if (!statusWahaResponse.ok) {
        // Se não encontrar a sessão (404) ou outro erro ao checar status
        const errorText = await statusWahaResponse.text()
        console.error(
          `[API Proxy /qr] Erro do WAHA ao verificar status pré-QR (${statusWahaResponse.status}) para '${sessionName}':`,
          errorText,
        )

        // Se for 404, a sessão não existe
        if (statusWahaResponse.status === 404) {
          console.warn(`[API Proxy /qr] Sessão não encontrada, mas continuando para tentar obter QR code`)
          // Continuamos mesmo com erro 404 no status, pois o endpoint do QR pode funcionar
        } else {
          let errorMsg = `WAHA Error checking status before QR: ${statusWahaResponse.status}`
          try {
            errorMsg = JSON.parse(errorText).message || errorText
          } catch (e) {
            /* ignore */
          }
          console.warn(`[API Proxy /qr] ${errorMsg}, mas continuando para tentar obter QR code`)
        }
      } else {
        const statusData = await statusWahaResponse.json()
        console.log(`[API Proxy /qr] Status recebido para '${sessionName}':`, statusData)

        // Verifica se já está conectado
        if (statusData?.engine?.state === "CONNECTED") {
          console.log(`[API Proxy /qr] Sessão '${sessionName}' já está CONECTADA (verificado pelo status).`)
          return NextResponse.json({
            success: true,
            connected: true,
            message: "Session already connected (checked via status)",
          })
        }
      }
    } catch (statusError) {
      console.warn(`[API Proxy /qr] Erro ao verificar status, continuando para QR: ${statusError}`)
      // Continua mesmo com erro no status
    }

    // --- PASSO 2: Obter o QR Code usando o formato correto ---
    const qrUrl = sessionName.startsWith("session_")
      ? `${WAHA_API_URL}/api/session_${sessionName.substring(8)}/auth/qr?format=image`
      : `${WAHA_API_URL}/api/session_${sessionName}/auth/qr?format=image`
    console.log(`[API Proxy /qr] PASSO 2: Tentando obter QR code: GET ${qrUrl}`)

    const qrHeaders: HeadersInit = {
      Accept: "image/png", // Importante: aceitar imagem PNG
      "User-Agent": BROWSER_USER_AGENT,
    }

    if (WAHA_API_KEY) {
      qrHeaders["Authorization"] = `Bearer ${WAHA_API_KEY}`
    }

    try {
      const qrWahaResponse = await fetch(qrUrl, {
        method: "GET",
        headers: qrHeaders,
        cache: "no-store",
      })

      // Analisa a resposta do QR
      if (qrWahaResponse.status === 422 || qrWahaResponse.status === 409) {
        console.log(
          `[API Proxy /qr] WAHA respondeu ${qrWahaResponse.status} para '${sessionName}' ao pedir QR (Possível conflito).`,
        )

        // Não assumir que está conectado, retornar o erro para que o frontend possa verificar o status real
        const errorText = await qrWahaResponse.text()
        let errorMessage = `Conflito ao obter QR code (${qrWahaResponse.status})`
        try {
          errorMessage = JSON.parse(errorText).message || errorText
        } catch (e) {
          errorMessage = errorText
        }

        return NextResponse.json(
          {
            success: false,
            error: true,
            message: errorMessage,
            status: qrWahaResponse.status,
            needStatusCheck: true, // Sinalizar que o frontend deve verificar o status
          },
          { status: qrWahaResponse.status },
        )
      }

      if (qrWahaResponse.status === 404) {
        console.error(`[API Proxy /qr] WAHA respondeu 404 para QR ${qrUrl}`)
        return NextResponse.json(
          { message: `QR code não disponível para sessão '${sessionName}'. A API retornou 404.` },
          { status: 404 },
        )
      }

      if (!qrWahaResponse.ok) {
        const errorText = await qrWahaResponse.text()
        console.error(
          `[API Proxy /qr] Erro da API WAHA (${qrWahaResponse.status}) ao pedir QR para '${sessionName}':`,
          errorText,
        )
        let errorMessage = `WAHA API Error (${qrWahaResponse.status})`
        try {
          errorMessage = JSON.parse(errorText).message || errorText
        } catch (e) {
          errorMessage = errorText
        }
        return NextResponse.json({ message: errorMessage }, { status: qrWahaResponse.status })
      }

      // Processar resposta bem-sucedida - agora esperamos uma imagem
      const contentType = qrWahaResponse.headers.get("content-type")
      if (contentType && contentType.includes("image")) {
        console.log(`[API Proxy /qr] QR Code imagem obtido com sucesso para '${sessionName}'`)

        // Converter a imagem para base64
        const imageBuffer = await qrWahaResponse.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString("base64")

        return NextResponse.json({
          success: true,
          connected: false,
          qrCode: base64Image,
        })
      } else {
        // Se não for uma imagem, tentar processar como JSON (fallback)
        console.warn(`[API Proxy /qr] Resposta não é uma imagem, tentando processar como JSON`)
        try {
          const jsonData = await qrWahaResponse.json()
          console.log(`[API Proxy /qr] Resposta processada como JSON:`, jsonData)

          // Verificar se há QR code ou status conectado no JSON
          if (jsonData.qrcode || jsonData.qr || jsonData.base64) {
            const qrBase64 = jsonData.qrcode || jsonData.qr || jsonData.base64
            return NextResponse.json({ success: true, connected: false, qrCode: qrBase64 })
          } else if (jsonData.connected) {
            return NextResponse.json({ success: true, connected: true })
          }
        } catch (jsonError) {
          console.error(`[API Proxy /qr] Erro ao processar resposta como JSON:`, jsonError)
        }

        // Se chegou aqui, não conseguimos processar a resposta
        return NextResponse.json(
          { message: `Erro: Resposta inesperada da WAHA ao pedir QR. Content-Type: ${contentType}` },
          { status: 502 },
        )
      }
    } catch (qrError) {
      console.error(`[API Proxy /qr] Erro ao obter QR code: ${qrError}`)
      return NextResponse.json(
        { message: `Erro ao obter QR code: ${qrError instanceof Error ? qrError.message : String(qrError)}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error(`[API Proxy /qr] Erro interno na rota para ${params.sessionName}:`, error)
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
