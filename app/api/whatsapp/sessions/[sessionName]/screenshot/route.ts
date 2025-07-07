// Arquivo: app/api/whatsapp/sessions/[sessionName]/screenshot/route.ts (USA CONFIG DA LIB)
import { type NextRequest, NextResponse } from "next/server"
// Importa a configuração
import { WAHA_CONFIG } from "@/lib/wahaConfig"
// Alternativa (caminho relativo):
// import { WAHA_CONFIG } from '../../../../lib/wahaConfig'; // Ajuste conforme necessário

// Usa apenas a URL importada (este endpoint não parece precisar de chave)
const WAHA_API_URL = WAHA_CONFIG.API_URL
// const WAHA_API_KEY = WAHA_CONFIG.API_KEY; // Chave não usada aqui

export async function GET(request: NextRequest, { params }: { params: { sessionName: string } }) {
  try {
    const sessionName = params.sessionName

    // Verifica se a URL foi definida no arquivo de configuração
    if (!WAHA_API_URL) {
      console.error("[API Proxy /screenshot] Erro: WAHA API URL não está definida em lib/wahaConfig.ts!")
      return NextResponse.json(
        { message: "Configuração interna do servidor incompleta: WAHA API URL não definida." },
        { status: 500 },
      )
    }

    console.log(`[API Proxy /screenshot] Chamando WAHA: GET ${WAHA_API_URL}/api/screenshot?session=${sessionName}`)

    try {
      // Tenta obter o screenshot, mas não falha se não conseguir
      const wahaResponse = await fetch(`${WAHA_API_URL}/api/screenshot?session=${sessionName}`, {
        method: "GET",
        headers: {
          Accept: "image/png",
        },
        cache: "no-store",
      })

      if (!wahaResponse.ok) {
        // Log do erro, mas não falha o processo
        console.warn(
          `[API Proxy /screenshot] Aviso: Não foi possível obter screenshot (${wahaResponse.status}) para '${sessionName}'. Continuando o processo...`,
        )
      } else {
        console.log(`[API Proxy /screenshot] Screenshot obtido com sucesso para '${sessionName}'.`)
      }
    } catch (screenshotError) {
      // Log do erro, mas não falha o processo
      console.warn(
        `[API Proxy /screenshot] Aviso: Erro ao obter screenshot para '${sessionName}': ${screenshotError}. Continuando o processo...`,
      )
    }

    // Sempre retorna sucesso para permitir que o processo continue
    return NextResponse.json({
      success: true,
      message: "Screenshot step completed (or skipped if not available).",
    })
  } catch (error) {
    console.error(`[API Proxy /screenshot] Erro interno na rota para ${params.sessionName}:`, error)
    // Ainda retorna sucesso para não bloquear o processo
    return NextResponse.json({
      success: true,
      message: "Screenshot step skipped due to error, continuing process.",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Método POST não permitido para esta rota. Use GET." }, { status: 405 })
}
