import { NextResponse } from "next/server"

// Esta é uma API simulada para demonstração
// Em um ambiente real, você se conectaria ao backend real do WhatsApp

export async function POST(request: Request) {
  try {
    // Simular um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const body = await request.json()
    const sessionName = body.name || "default"

    // Simular criação de sessão
    return NextResponse.json({
      success: true,
      name: sessionName,
      status: "STARTING",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao criar sessão:", error)
    return NextResponse.json({ success: false, error: "Falha ao criar sessão" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    // Obter o sessionId da URL
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId") || "default"

    // Simular um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Simular lista de sessões
    return NextResponse.json({
      success: true,
      sessions: [
        {
          name: sessionId,
          status: Math.random() > 0.3 ? "CONNECTED" : "STARTING",
          timestamp: new Date().toISOString(),
        },
      ],
    })
  } catch (error) {
    console.error("Erro ao listar sessões:", error)
    return NextResponse.json({ success: false, error: "Falha ao listar sessões" }, { status: 500 })
  }
}
