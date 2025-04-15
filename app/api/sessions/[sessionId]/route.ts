import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const sessionId = params.sessionId

    // Simular um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Simular status da sessão
    // Para demonstração, vamos usar um número aleatório para simular diferentes estados
    const random = Math.random()
    let status = "STARTING"

    if (random < 0.2) {
      status = "STARTING"
    } else if (random < 0.3) {
      status = "DISCONNECTED"
    } else if (random < 0.4) {
      status = "STOPPED"
    } else {
      status = "CONNECTED"
    }

    return NextResponse.json({
      success: true,
      name: sessionId,
      status: status,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao verificar status da sessão:", error)
    return NextResponse.json({ success: false, error: "Falha ao verificar status da sessão" }, { status: 500 })
  }
}
