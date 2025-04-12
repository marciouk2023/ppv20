import { NextResponse } from "next/server"

// Esta é uma API simulada para demonstração
// Em um ambiente real, você verificaria o status real da conexão

export async function GET(request: Request) {
  try {
    // Obter o sessionId da URL
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "SessionId não fornecido" }, { status: 400 })
    }

    // Simular um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Em um ambiente real, você verificaria o status real da conexão
    // Para demonstração, vamos simular uma conexão bem-sucedida após alguns segundos

    // Verificar se o sessionId termina com um número par para simular sucesso/falha
    const lastChar = sessionId.charAt(sessionId.length - 1)
    const isEven = Number.parseInt(lastChar, 36) % 2 === 0

    // Simular uma chance de 20% de erro para demonstração
    const randomError = Math.random() < 0.2

    // Se o sessionId for par e não houver erro aleatório, simular sucesso
    if (isEven && !randomError) {
      return NextResponse.json({
        success: true,
        status: "connected",
        message: "WhatsApp conectado com sucesso",
      })
    } else {
      return NextResponse.json({
        success: false,
        status: "error",
        message: "Falha ao conectar com o WhatsApp. QR code expirado ou inválido.",
      })
    }
  } catch (error) {
    console.error("Erro ao verificar status da conexão:", error)
    return NextResponse.json({ success: false, error: "Falha ao verificar status da conexão" }, { status: 500 })
  }
}
