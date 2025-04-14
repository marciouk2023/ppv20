// app/api/cron/check-birthdays/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where } from "firebase/firestore"
import { sendMessage } from "@/utils/message-sender"

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
          totalMessagesAttempted++

          // Escolher uma mensagem aleatória
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          const message = birthdayMessages[randomIndex]

          // Usar a função centralizada para enviar a mensagem
          const sendResult = await sendMessage({
            userEmail,
            contactId: contact.id,
            contactName: contact.nome,
            contactPhone: contact.telefone,
            message,
            usePersonalization: true,
            messageType: "birthday",
          })

          if (sendResult.success) {
            totalMessagesSent++
            results.push({ user: userEmail, contact: contact.nome, status: "success" })
            console.log(`[CRON] ✅ Mensagem enviada com sucesso para ${contact.nome} (${userEmail}).`)
          } else {
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "error",
              error: sendResult.error || "Erro desconhecido ao enviar mensagem",
            })
            console.error(`[CRON] ❌ Falha ao enviar mensagem para ${contact.nome} (${userEmail}): ${sendResult.error}`)
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
