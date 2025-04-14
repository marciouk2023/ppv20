// app/api/cron/check-birthdays/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where, doc, Timestamp } from "firebase/firestore"

// Função auxiliar para buscar contatos aniversariantes
async function getUserBirthdayContacts(userEmail: string, currentDay: number, currentMonth: number) {
  const contactsRef = collection(db, `parabenspravoce/${userEmail}/users`)
  const snapshot = await getDocs(contactsRef)
  const birthdayContacts: Array<{ id: string; nome: string; telefone: string; data_de_nascimento: string }> = []

  snapshot.docs.forEach((doc) => {
    const contact = doc.data()
    if (!contact.data_de_nascimento || !contact.telefone) return // Pula se não tiver data ou telefone

    let birthDay: number, birthMonth: number
    try {
      if (contact.data_de_nascimento.includes("/")) {
        // DD/MM/YYYY
        ;[birthDay, birthMonth] = contact.data_de_nascimento.split("/").map(Number)
      } else if (contact.data_de_nascimento.includes("-")) {
        // YYYY-MM-DD ou outros formatos com hífen
        const parts = contact.data_de_nascimento.split("-")
        if (parts.length === 3) {
          birthMonth = Number.parseInt(parts[1], 10)
          birthDay = Number.parseInt(parts[2], 10)
        } else {
          console.warn(
            `[CRON] Formato de data com hífen não reconhecido: ${contact.data_de_nascimento} para ${userEmail}`,
          )
          return // Pula se não conseguir identificar
        }
      } else {
        return // Formato desconhecido
      }

      // Verifica se é aniversário hoje
      if (!isNaN(birthDay) && !isNaN(birthMonth) && birthDay === currentDay && birthMonth === currentMonth) {
        birthdayContacts.push({
          id: doc.id,
          nome: contact.nome || "Aniversariante",
          telefone: contact.telefone,
          data_de_nascimento: contact.data_de_nascimento,
        })
      }
    } catch (e) {
      console.error(
        `[CRON] Erro ao processar data ${contact.data_de_nascimento} para contato ${doc.id} do usuário ${userEmail}:`,
        e instanceof Error ? e.message : e,
      )
    }
  })
  return birthdayContacts
}

// Função para verificar e marcar mensagem como enviada em uma única transação atômica
async function checkAndMarkMessageSent(userEmail: string, contactId: string): Promise<boolean> {
  try {
    // Usar transação do Firestore para operações atômicas
    return await db.runTransaction(async (transaction) => {
      const contactRef = doc(db, `parabenspravoce/${userEmail}/users`, contactId)
      const contactDoc = await transaction.get(contactRef)

      if (!contactDoc.exists()) {
        console.log(`[CRON] Contato ${contactId} não encontrado`)
        return false
      }

      const contactData = contactDoc.data()

      // Verificar se já enviou hoje
      if (contactData.lastBirthdayMessageSent) {
        const lastSent = contactData.lastBirthdayMessageSent.toDate()
        const today = new Date()

        // Verificar se a data de envio é hoje
        if (
          lastSent.getDate() === today.getDate() &&
          lastSent.getMonth() === today.getMonth() &&
          lastSent.getFullYear() === today.getFullYear()
        ) {
          console.log(`[CRON] Mensagem já enviada hoje para ${contactId}`)
          return false // Já enviou hoje
        }
      }

      // Se não enviou hoje, marcar como enviado na mesma transação
      transaction.update(contactRef, {
        lastBirthdayMessageSent: Timestamp.now(),
        birthdayMessageSentThisYear: true,
      })

      console.log(`[CRON] Marcando envio de mensagem para ${contactId} (transação)`)
      return true // Pode enviar
    })
  } catch (error) {
    console.error(`[CRON] Erro na transação para ${contactId}:`, error)
    return false
  }
}

// Função para buscar mensagens da rota /mensagens
async function getBirthdayMessages(userEmail: string) {
  try {
    // Buscar mensagens da coleção correta (templates ou messages)
    const messagesRef = collection(db, `parabenspravoce/${userEmail}/templates`)
    const snapshot = await getDocs(query(messagesRef, where("type", "==", "birthday")))

    if (snapshot.empty) {
      console.log(`[CRON] Nenhuma mensagem de aniversário encontrada para ${userEmail}`)
      return []
    }

    // Mapear documentos para array de mensagens
    const messages = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return data.content || data.message || ""
      })
      .filter((msg) => msg.trim() !== "")

    console.log(`[CRON] Encontradas ${messages.length} mensagens de aniversário para ${userEmail}`)
    return messages
  } catch (error) {
    console.error(`[CRON] Erro ao buscar mensagens para ${userEmail}:`, error)
    return []
  }
}

// Função auxiliar para enviar mensagem
async function sendWhatsAppMessage(
  apiUrl: string,
  contact: { id: string; nome: string; telefone: string },
  message: string,
  userEmail: string,
) {
  const messageId = `birthday_${userEmail}_${contact.id}_${new Date().toISOString().split("T")[0]}`

  console.log(
    `[CRON] Tentando enviar para ${contact.nome} (${contact.telefone}) do usuário ${userEmail} com ID: ${messageId}`,
  )
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumber: contact.telefone,
      message: message,
      userEmail: userEmail,
      messageId: messageId, // Adicionar ID único para deduplicação
    }),
  })

  if (!response.ok) {
    let errorData
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: await response.text() }
    }
    console.error(`[CRON] ❌ Falha ao enviar para ${contact.nome}. Status: ${response.status}. Erro:`, errorData)
    return { success: false, error: errorData.message || `Erro ${response.status}` }
  }

  const result = await response.json()
  console.log(`[CRON] ✅ Mensagem enviada com sucesso para ${contact.nome} (${userEmail}). Resposta API:`, result)
  return { success: true, result }
}

export async function GET(request: Request) {
  // Verificação de segurança usando o CRON_SECRET
  const authHeader = request.headers.get("Authorization")
  const expectedSecretValue = process.env.CRON_SECRET
  const expectedAuth = `Bearer ${expectedSecretValue}`

  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const isValidAuth = authHeader === expectedAuth

  console.log(`[CRON DEBUG] Header 'Authorization' recebido: ${authHeader}`)
  console.log(`[CRON DEBUG] Valor esperado de process.env.CRON_SECRET: ${expectedSecretValue}`)
  console.log(`[CRON DEBUG] String 'expectedAuth' construída: ${expectedAuth}`)
  console.log(`[CRON DEBUG] Comparação 'authHeader === expectedAuth': ${isValidAuth}`)
  console.log(
    `[CRON DEBUG] Header 'x-vercel-cron': ${request.headers.get("x-vercel-cron")}, isVercelCron: ${isVercelCron}`,
  )

  if (!isVercelCron && !isValidAuth) {
    console.error("[CRON] Tentativa de acesso não autorizado (Falha na verificação!)")
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  if (isVercelCron) {
    console.log("[CRON] Autenticação OK (Vercel Cron). Iniciando verificação de aniversariantes...")
  } else {
    console.log("[CRON] Autenticação OK (Header Authorization). Iniciando verificação de aniversariantes...")
  }

  const executionTime = new Date()
  const currentHour = executionTime.getHours()
  const currentMinute = executionTime.getMinutes()
  const currentDay = executionTime.getDate()
  const currentMonth = executionTime.getMonth() + 1 // getMonth() é 0-11

  // URL da API de envio de mensagem
  let sendMessageApiUrl: string
  try {
    sendMessageApiUrl = new URL("/api/messages/send", request.url).toString()
  } catch (urlError) {
    console.warn("[CRON] Falha ao construir URL relativa, usando URL absoluta fallback.")
    sendMessageApiUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/messages/send`
      : "https://v0-whatsapp-qr-code-bot-hoaqep.vercel.app/api/messages/send"
  }
  console.log(`[CRON] Usando URL para envio de mensagem: ${sendMessageApiUrl}`)

  const results: Array<{ user: string; contact?: string; status: string; error?: string }> = []
  let totalMessagesAttempted = 0
  let totalMessagesSent = 0

  try {
    const userSettingsCollection = collection(db, "user_settings")
    const userSettingsSnapshot = await getDocs(userSettingsCollection)

    console.log(
      `[CRON] Verificando ${userSettingsSnapshot.docs.length} usuários às ${currentHour}:${String(currentMinute).padStart(2, "0")}`,
    )

    for (const userDoc of userSettingsSnapshot.docs) {
      const userEmail = userDoc.id
      const userSettings = userDoc.data()
      const configuredTime = userSettings && userSettings.sendTime ? userSettings.sendTime : "08:00"

      let configHour: number, configMinute: number
      try {
        if (typeof configuredTime !== "string" || !configuredTime.includes(":")) {
          throw new Error("Formato de hora inválido ou tipo incorreto")
        }
        ;[configHour, configMinute] = configuredTime.split(":").map(Number)
        if (isNaN(configHour) || isNaN(configMinute)) {
          throw new Error("Resultado da conversão de hora não é número")
        }
      } catch (e) {
        console.error(
          `[CRON] Formato de hora inválido ('${configuredTime}') para usuário ${userEmail}. Pulando. Erro:`,
          e instanceof Error ? e.message : e,
        )
        results.push({ user: userEmail, status: "error", error: `Formato de hora inválido: ${configuredTime}` })
        continue
      }

      const isTimeToSend =
        configHour === currentHour && configMinute >= currentMinute && configMinute < currentMinute + 5

      if (!isTimeToSend) {
        continue
      }

      console.log(
        `[CRON] Horário CORRESPONDE para ${userEmail}! (Config: ${configuredTime} / Atual: ${currentHour}:${String(currentMinute).padStart(2, "0")}). Buscando aniversariantes...`,
      )

      try {
        // Buscar aniversariantes do dia
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth)

        if (birthdayContacts.length === 0) {
          console.log(`[CRON] Nenhum aniversariante encontrado hoje para ${userEmail}.`)
          continue
        }

        console.log(
          `[CRON] Encontrados ${birthdayContacts.length} aniversariantes para ${userEmail}: ${birthdayContacts.map((c) => c.nome).join(", ")}. Preparando envio...`,
        )

        // Buscar mensagens de aniversário da rota /mensagens
        const birthdayMessages = await getBirthdayMessages(userEmail)

        if (birthdayMessages.length === 0) {
          console.log(`[CRON] Nenhuma mensagem de aniversário encontrada para ${userEmail}. Pulando envio.`)
          results.push({
            user: userEmail,
            status: "error",
            error: "Nenhuma mensagem de aniversário cadastrada na rota /mensagens",
          })
          continue
        }

        for (const contact of birthdayContacts) {
          // Usar a nova função de transação para verificar e marcar como enviado atomicamente
          const canSendMessage = await checkAndMarkMessageSent(userEmail, contact.id)

          if (!canSendMessage) {
            console.log(`[CRON] Pulando envio para ${contact.nome} - já enviado hoje ou erro na transação`)
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "skipped",
              error: "Mensagem já enviada hoje ou erro na transação",
            })
            continue
          }

          totalMessagesAttempted++

          // Gerar ID único para esta mensagem específica (para deduplicação)
          const messageId = `birthday_${userEmail}_${contact.id}_${new Date().toISOString().split("T")[0]}`

          // [Passo 1] Verificar se existe uma mensagem personalizada agendada
          const campaignsRef = collection(db, `parabenspravoce/${userEmail}/campaigns`)
          const q = query(campaignsRef, where("contactId", "==", contact.id), where("status", "==", "scheduled"))
          const snapshot = await getDocs(q)

          let messageSent = false

          if (!snapshot.empty) {
            // Se SIM: Enviar apenas essa mensagem personalizada
            const campaign = snapshot.docs[0].data()
            console.log(`[CRON] Encontrada mensagem personalizada para ${contact.nome}. Enviando...`)

            // Personalizar mensagem com nome do contato
            let personalizedMessage = campaign.message || ""
            if (campaign.usePersonalization !== false) {
              const firstName = contact.nome && typeof contact.nome === "string" ? contact.nome.split(" ")[0] : "você"
              personalizedMessage = personalizedMessage.replace(/{nome}/g, firstName)
            }

            const sendResult = await sendWhatsAppMessage(sendMessageApiUrl, contact, personalizedMessage, userEmail)

            if (sendResult.success) {
              totalMessagesSent++
              results.push({ user: userEmail, contact: contact.nome, status: "success" })
              messageSent = true
            } else {
              results.push({
                user: userEmail,
                contact: contact.nome,
                status: "error",
                error: sendResult.error || "Erro desconhecido ao enviar mensagem personalizada",
              })
            }
          } else if (!messageSent) {
            // Se NÃO: Buscar uma mensagem aleatória da rota /mensagens
            const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
            let message = birthdayMessages[randomIndex]

            // Personalizar mensagem com nome do contato
            const firstName = contact.nome && typeof contact.nome === "string" ? contact.nome.split(" ")[0] : "você"
            message = message.replace(/{nome}/g, firstName)

            console.log(
              `[CRON] Nenhuma mensagem personalizada encontrada para ${contact.nome}. Enviando mensagem aleatória da rota /mensagens...`,
            )

            const sendResult = await sendWhatsAppMessage(sendMessageApiUrl, contact, message, userEmail)

            if (sendResult.success) {
              totalMessagesSent++
              results.push({ user: userEmail, contact: contact.nome, status: "success" })
            } else {
              results.push({
                user: userEmail,
                contact: contact.nome,
                status: "error",
                error: sendResult.error || "Erro desconhecido ao enviar mensagem aleatória",
              })
            }
          }
        }
      } catch (userProcessingError) {
        console.error(`[CRON] Erro ao processar aniversariantes para ${userEmail}:`, userProcessingError)
        results.push({
          user: userEmail,
          status: "error",
          error: `Erro ao buscar/processar contatos: ${userProcessingError instanceof Error ? userProcessingError.message : String(userProcessingError)}`,
        })
      }
    }

    console.log(
      `[CRON] Verificação concluída. ${totalMessagesSent} de ${totalMessagesAttempted} mensagens enviadas/tentadas.`,
    )
    return NextResponse.json({
      success: true,
      timestamp: executionTime.toISOString(),
      checkedUsers: userSettingsSnapshot.docs.length,
      messagesAttempted: totalMessagesAttempted,
      messagesSent: totalMessagesSent,
      details: results,
    })
  } catch (error) {
    console.error("[CRON] Erro GERAL na execução:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: executionTime.toISOString(),
      },
      { status: 500 },
    )
  }
}
