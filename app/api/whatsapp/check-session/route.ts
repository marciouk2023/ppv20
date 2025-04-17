// app/api/whatsapp/check-session/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { getWAHABaseURL } from "@/lib/wahaConfig"

export async function GET(request: NextRequest) {
  try {
    const wahaBaseURL = getWAHABaseURL()
    const sessionName = "default"

    const response = await fetch(`${wahaBaseURL}/api/sessions/${sessionName}/status`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao verificar sessão",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 },
    )
  }
}
