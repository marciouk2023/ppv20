import { NextResponse } from "next/server"

// Esta é uma API simulada para demonstração
// Em um ambiente real, você se conectaria ao backend real em api.parabenspravoce.com

export async function POST(request: Request) {
  try {
    // Simular um atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Gerar um ID de sessão aleatório
    const sessionId = Math.random().toString(36).substring(2, 15)

    // Em um ambiente real, você obteria o QR code da API real
    // Aqui estamos usando um QR code de exemplo que aponta para um site
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=whatsapp-connect-${sessionId}`

    return NextResponse.json({
      success: true,
      qrCode,
      sessionId,
    })
  } catch (error) {
    console.error("Erro ao gerar QR code:", error)
    return NextResponse.json({ success: false, error: "Falha ao gerar QR code" }, { status: 500 })
  }
}
