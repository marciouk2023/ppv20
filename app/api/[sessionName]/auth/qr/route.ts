// Arquivo: app/api/[sessionName]/auth/qr/route.ts (COM CHECAGEM DE STATUS)
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
    const statusUrl = `${WAHA_API_URL}/api/sessions/${sessionName}`
    console.log(`[API Proxy /qr] PASSO 1: Verificando status ANTES de pedir QR: GET ${statusUrl}`)
    const statusHeaders: HeadersInit = { Accept: "application/json" }
    // Adicionar Auth Key aqui se o endpoint de status precisar (verificar documentação)
    // if (WAHA_API_KEY) { headers['Authorization'] = `Bearer ${WAHA_API_KEY}`; }

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
      let errorMsg = `WAHA Error checking status before QR: ${statusWahaResponse.status}`
      try {
        errorMsg = JSON.parse(errorText).message || errorText
      } catch (e) {
        /* ignore */
      }
      return NextResponse.json(
        { message: errorMsg, success: false, connected: false },
        { status: statusWahaResponse.status },
      )
    }

    const statusData = await statusWahaResponse.json()
    console.log(`[API Proxy /qr] Status recebido para '${sessionName}':`, statusData)

    // Verifica se já está conectado (engine.state talvez?)
    if (statusData?.engine?.state === "CONNECTED") {
      console.log(`[API Proxy /qr] Sessão '${sessionName}' já está CONECTADA (verificado pelo status).`)
      return NextResponse.json({
        success: true,
        connected: true,
        message: "Session already connected (checked via status)",
      })
    }

    // Verifica se está no estado esperado para escanear QR Code
    // Baseado no exemplo de erro 422, o status pode ser um campo 'status' na raiz?
    const currentStatus = statusData?.status // Ex: "STARTING", "WORKING", "SCAN_QR_CODE"
    const expectedStatusForQR = "SCAN_QR_CODE" // <--- Assumindo baseado no erro 422, VERIFICAR DOC!

    if (currentStatus !== expectedStatusForQR) {
      console.warn(
        `[API Proxy /qr] Sessão '${sessionName}' não está no estado '${expectedStatusForQR}' (Atual: '${currentStatus}'). Não pedindo QR code.`,
      )
      // Retorna um erro 409 (Conflict) ou 422 indicando estado inválido
      return NextResponse.json(
        {
          success: false,
          connected: false,
          message: `Session not in expected state for QR code scan. Current status: ${currentStatus || "Unknown"}. Expected: ${expectedStatusForQR}`,
          status: currentStatus || "Unknown",
        },
        { status: 409 },
      ) // Conflict
    }

    // --- PASSO 2: Se o status está OK, Tenta Obter o QR Code ---
    console.log(
      `[API Proxy /qr] PASSO 2: Status OK ('${currentStatus}'), tentando obter QR code para '${sessionName}'...`,
    )
    // Usando format=raw como no teste anterior, mas pode voltar para format=image se preferir testar
    const qrUrl = `${WAHA_API_URL}/api/${sessionName}/auth/qr?format=raw`
    const qrHeaders: HeadersInit = {
      Accept: "application/json", // Esperando JSON com base64
      "User-Agent": BROWSER_USER_AGENT,
    }
    if (WAHA_API_KEY) {
      /* Adicionar auth se necessário */
    }

    const qrWahaResponse = await fetch(qrUrl, {
      method: "GET",
      headers: qrHeaders,
      cache: "no-store",
    })

    // Analisa a resposta do QR (igual ao código anterior para format=raw)
    if (qrWahaResponse.status === 422 || qrWahaResponse.status === 409) {
      console.log(
        `[API Proxy /qr] WAHA respondeu ${qrWahaResponse.status} para '${sessionName}' ao pedir QR (Já conectado/Conflito).`,
      )
      return NextResponse.json({
        success: true,
        connected: true,
        message: `Session already connected or QR conflict (WAHA Status ${qrWahaResponse.status})`,
      })
    }
    if (qrWahaResponse.status === 404) {
      console.error(`[API Proxy /qr] WAHA respondeu 404 para '${sessionName}' ao pedir QR (Sessão sumiu?).`)
      return NextResponse.json(
        { message: `Session '${sessionName}' disappeared before QR fetch (WAHA 404).` },
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

    const qrContentType = qrWahaResponse.headers.get("content-type")
    if (qrContentType && qrContentType.includes("application/json")) {
      const qrData = await qrWahaResponse.json()
      const qrBase64 = qrData.qrcode || qrData.qr || qrData.base64 || qrData.result
      if (qrBase64) {
        console.log(`[API Proxy /qr] QR Code para '${sessionName}' obtido como JSON/base64.`)
        const cleanBase64 = qrBase64.startsWith("data:image") ? qrBase64.split(",")[1] : qrBase64
        return NextResponse.json({ success: true, connected: false, qrCode: cleanBase64 })
      } else {
        console.error(`[API Proxy /qr] ERRO: WAHA respondeu JSON OK para QR, mas sem QR code. Resposta:`, qrData)
        return NextResponse.json(
          { message: `Erro: WAHA respondeu JSON OK mas sem QR code (format=raw).` },
          { status: 502 },
        )
      }
    } else {
      const responseText = await qrWahaResponse.text()
      console.error(
        `[API Proxy /qr] ERRO GRAVE: WAHA respondeu 200 OK para QR MAS Content-Type é '${qrContentType}' (esperado 'application/json' com format=raw). Corpo:`,
        responseText,
      )
      return NextResponse.json(
        { message: `Erro: Resposta inesperada da WAHA ao pedir QR (format=raw). Content-Type: ${qrContentType}` },
        { status: 502 },
      )
    }

    // Tratamento de erro geral
  } catch (error) {
    console.error(`[API Proxy /qr] Erro interno na rota para ${sessionName}:`, error)
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
