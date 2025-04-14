// app/api/messages/send/route.ts
// Arquivo renomeado de app/api/whatsapp/send-message/route.ts para app/api/messages/send/route.ts

import { type NextRequest, NextResponse } from "next/server"
import https from "https"
import { WAHA_CONFIG } from "@/lib/wahaConfig"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

export async function POST(request: NextRequest) {
  const agent = new https.Agent({ rejectUnauthorized: false })

  if (!WAHA_CONFIG.API_URL || !WAHA_CONFIG.API_KEY) {
    console.error("[API send-message] Erro: WAHA API URL ou API Key não definida!")
    return NextResponse.json({ success: false, message: "Configuração interna incompleta." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { phoneNumber, message, sessionName, messageId } = body

    // NOVO: Verificar ID da mensagem para deduplicação
    if (messageId) {
      // Verificar se esta mensagem já foi enviada nas últimas 24 horas
      try {
        const recentMessagesRef = collection(db, "recent_messages")
        const q = query(
          recentMessagesRef,
          where("messageId", "==", messageId),
          where("timestamp", ">", new Date(Date.now() - 24 * 60 * 60 * 1000)), // Últimas 24 horas
        )

        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          console.log(`[API send-message] Mensagem duplicada detectada com ID: ${messageId}. Ignorando.`)
          return NextResponse.json({
            success: true,
            message: "Mensagem já enviada anteriormente (deduplicada)",
            duplicated: true,
          })
        }

        // Registrar esta mensagem para deduplicação futura
        await addDoc(recentMessagesRef, {
          messageId,
          phoneNumber,
          message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          timestamp: new Date(),
        })
      } catch (dedupeError) {
        // Se houver erro na deduplicação, registrar mas continuar com o envio
        console.warn(`[API send-message] Erro ao verificar duplicação: ${dedupeError}. Continuando com o envio.`)
      }
    }

    if (!phoneNumber || !message || !sessionName) {
      // Validação básica dos campos recebidos
      console.warn("[API send-message] Requisição inválida. Faltando phoneNumber, message ou sessionName.")
      const missing = []
      if (!phoneNumber) missing.push("phoneNumber")
      if (!message) missing.push("message")
      if (!sessionName) missing.push("sessionName")
      return NextResponse.json(
        { success: false, message: `Campos obrigatórios faltando: ${missing.join(", ")}` },
        { status: 400 },
      )
    }

    // <<< CORREÇÃO DA FORMATAÇÃO >>>
    // 1. Remove todos os caracteres não-numéricos.
    //    ASSUME que o usuário digitou o CÓDIGO DO PAÍS (DDI) no frontend.
    let chatId = phoneNumber.replace(/\D/g, "")

    // 2. Verifica se sobrou um número razoável (ex: mais que 5 dígitos)
    if (chatId.length < 6) {
      // Ajuste o tamanho mínimo se necessário
      console.error("[API send-message] Número de telefone inválido após limpeza:", phoneNumber)
      return NextResponse.json(
        { success: false, message: "Número de telefone inválido fornecido (muito curto após limpeza)." },
        { status: 400 },
      )
    }

    // 3. Garante que termina com @c.us (o WAHA espera isso)
    if (!chatId.endsWith("@c.us")) {
      chatId = `${chatId}@c.us`
    }
    // <<< FIM DA CORREÇÃO DA FORMATAÇÃO >>>

    console.log(`[API send-message] Formatado chatId FINAL (esperando DDI do input): ${chatId}`)

    // Remove o prefixo 'session_' do nome da sessão para enviar ao WAHA
    const wahaSessionName = sessionName.startsWith("session_") ? sessionName.substring(8) : sessionName
    console.log(`[API send-message] Usando nome de sessão para WAHA: ${wahaSessionName}`)

    // Prepara cabeçalhos e corpo da requisição para WAHA
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": WAHA_CONFIG.API_KEY,
    }
    const requestBody = {
      chatId: chatId, // Número JÁ DEVE conter DDI + @c.us
      text: message,
      session: wahaSessionName,
    }

    const wahaEndpoint = `${WAHA_CONFIG.API_URL}/api/sendText`
    console.log(`[API send-message] Chamando WAHA: POST ${wahaEndpoint} com body: ${JSON.stringify(requestBody)}`)

    // Chama a API WAHA
    const wahaResponse = await fetch(wahaEndpoint, {
      method: "POST",
      // @ts-ignore
      agent,
      headers: headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    const responseText = await wahaResponse.text()

    // Verifica resposta
    if (!wahaResponse.ok) {
      console.error(
        `[API send-message] Erro da API WAHA (${wahaResponse.status}) ao enviar para '${chatId}' usando sessão '${wahaSessionName}': ${responseText}`,
      )
      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        errorMessage = JSON.parse(responseText).message || responseText
      } catch (e) {
        errorMessage = responseText
      }
      return NextResponse.json({ success: false, message: errorMessage }, { status: wahaResponse.status })
    }

    // Processa sucesso
    console.log(
      `[API send-message] Resposta OK (${wahaResponse.status}) da WAHA para enviar para '${chatId}' usando sessão '${wahaSessionName}'. Resposta: ${responseText}`,
    )
    let responseData = {}
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem enviada com sucesso via WAHA.",
      data: responseData,
    })
  } catch (error) {
    console.error("[API send-message] Erro interno na rota:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no servidor ao enviar mensagem.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Adiciona um GET handler apenas para retornar 405 (Method Not Allowed)
export async function GET(request: NextRequest) {
  console.log("[API send-message] Recebido GET request (não permitido).")
  return NextResponse.json({ message: "Método GET não permitido para esta rota. Use POST." }, { status: 405 })
}
