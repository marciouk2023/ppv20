// Caminho: app/api/whatsapp/check-session/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { checkUserSession } from "@/lib/session-manager"

export async function GET(request: NextRequest) {
  try {
    // Obter o email do usuário da query string
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get("userEmail")

    if (!userEmail) {
      return NextResponse.json({ success: false, message: "Email do usuário não fornecido" }, { status: 400 })
    }

    // Verificar se o usuário tem uma sessão
    const sessionInfo = await checkUserSession(userEmail)

    return NextResponse.json({
      success: true,
      hasSession: sessionInfo.hasSession,
      sessionName: sessionInfo.sessionName,
      status: sessionInfo.status,
    })
  } catch (error) {
    console.error("[API /check-session] Erro:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao verificar sessão",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
