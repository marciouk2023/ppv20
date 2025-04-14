// app/api/cron/check-birthdays/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where } from "firebase/firestore"
// Certifique-se que o caminho está correto para sua estrutura
import { sendMessage } from "@/utils/message-sender"

// Função auxiliar para buscar contatos aniversariantes
async function getUserBirthdayContacts(userEmail: string, currentDay: number, currentMonth: number) {
  // Coleção de contatos do usuário específico
  const contactsRef = collection(db, `parabenspravoce/${userEmail}/users`)
  const snapshot = await getDocs(contactsRef)
  const birthdayContacts: Array<{ id: string; nome: string; telefone: string; data_de_nascimento: string }> = []

  snapshot.docs.forEach((doc) => {
    const contact = doc.data()
    if (!contact.data_de_nascimento || !contact.telefone) return // Pula se não tiver data ou telefone

    let birthDay: number | undefined, birthMonth: number | undefined
    try {
      const dobString = String(contact.data_de_nascimento).trim() // Garante que é string
      if (dobString.includes("/")) {
        // Formato DD/MM ou DD/MM/YYYY
        const parts = dobString.split("/")
        if (parts.length >= 2) {
          birthDay = Number.parseInt(parts[0], 10)
          birthMonth = Number.parseInt(parts[1], 10)
        }
      } else if (dobString.includes("-")) {
        // Formato YYYY-MM-DD (mais comum) ou MM-DD
        const parts = dobString.split("-")
        if (parts.length === 3) {
          // YYYY-MM-DD
          birthMonth = Number.parseInt(parts[1], 10)
          birthDay = Number.parseInt(parts[2], 10)
        } else if (parts.length === 2) {
          // MM-DD (menos provável, mas possível)
          birthMonth = Number.parseInt(parts[0], 10)
          birthDay = Number.parseInt(parts[1], 10)
        }
      }

      // Verifica se conseguiu extrair e se é aniversário hoje
      if (
        birthDay !== undefined &&
        birthMonth !== undefined &&
        !isNaN(birthDay) &&
        !isNaN(birthMonth) &&
        birthDay === currentDay &&
        birthMonth === currentMonth
      ) {
        birthdayContacts.push({
          id: doc.id,
          nome: contact.nome || "Aniversariante",
          telefone: contact.telefone,
          data_de_nascimento: dobString,
        })
      }
    } catch (e) {
      console.error(
        `[CRON] Erro ao processar data '${contact.data_de_nascimento}' para contato ${doc.id} do usuário ${userEmail}:`,
        e instanceof Error ? e.message : e,
      )
    }
  })
  return birthdayContacts
}

// Função para buscar mensagens de aniversário
async function getBirthdayMessages(userEmail: string): Promise<string[]> {
  try {
    // Assume que os modelos estão nesta coleção
    const messagesRef = collection(db, `parabenspravoce/${userEmail}/templates`)
    // Query para buscar documentos onde o campo 'type' é 'birthday'
    const q = query(messagesRef, where("type", "==", "birthday"))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log(`[CRON] Nenhuma mensagem de aniversário (type='birthday') encontrada em /templates para ${userEmail}`)
      return []
    }

    const messages = snapshot.docs
      .map((doc) => doc.data().content || doc.data().message || "") // Pega 'content' ou 'message'
      .filter((msg): msg is string => typeof msg === "string" && msg.trim() !== "") // Garante que é string não vazia

    console.log(`[CRON] Encontradas ${messages.length} mensagens de aniversário em /templates para ${userEmail}`)
    return messages
  } catch (error) {
    console.error(`[CRON] Erro ao buscar mensagens em /templates para ${userEmail}:`, error)
    return []
  }
}

// Handler da Rota (executado pelo Cron)
export async function GET(request: Request) {
  // Verificação de segurança (importante em produção)
  const authHeader = request.headers.get("Authorization")
  const expectedSecretValue = process.env.CRON_SECRET
  if (!expectedSecretValue) {
    console.error("[CRON] CRON_SECRET não está definido nas variáveis de ambiente!")
    return NextResponse.json({ success: false, error: "Configuração de segurança ausente." }, { status: 500 })
  }
  const expectedAuth = `Bearer ${expectedSecretValue}`

  // Permite acesso se for um cron do Vercel OU se o header Authorization estiver correto
  const isVercelCron = request.headers.get("x-vercel-cron") === "true" // Header específico do Vercel Cron Jobs
  const isValidAuth = authHeader === expectedAuth

  if (!isVercelCron && !isValidAuth) {
    console.warn(`[CRON] Tentativa de acesso não autorizado. Header: ${authHeader}`)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const authMethod = isVercelCron ? "Vercel Cron" : "Header Authorization"
  console.log(`[CRON] Autenticação OK (${authMethod}). Iniciando verificação...`)

  const executionTime = new Date()
  // Horário UTC (Vercel roda em UTC) - Ajuste se seu servidor/comparação for local
  const currentHour = executionTime.getUTCHours()
  const currentMinute = executionTime.getUTCMinutes()
  const currentDay = executionTime.getUTCDate()
  const currentMonth = executionTime.getUTCMonth() + 1 // getUTCMonth é 0-11

  const results: Array<{ user: string; contact?: string; status: string; error?: string; messageId?: string }> = []
  let totalMessagesAttempted = 0
  let totalMessagesSent = 0
  let usersProcessed = 0

  try {
    const userSettingsCollection = collection(db, "user_settings")
    const userSettingsSnapshot = await getDocs(userSettingsCollection)

    console.log(
      `[CRON UTC ${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}] Verificando ${userSettingsSnapshot.docs.length} usuários.`,
    )

    for (const userDoc of userSettingsSnapshot.docs) {
      usersProcessed++
      const userEmail = userDoc.id
      const userSettings = userDoc.data()
      const configuredTime = userSettings?.sendTime ?? "08:00" // Default para 08:00 se não existir

      let configHour: number, configMinute: number
      try {
        if (typeof configuredTime !== "string" || !configuredTime.includes(":")) {
          throw new Error("Formato de hora inválido")
        }
        ;[configHour, configMinute] = configuredTime.split(":").map(Number)
        if (isNaN(configHour) || isNaN(configMinute)) {
          throw new Error("Hora/Minuto não são números")
        }
      } catch (e) {
        console.error(
          `[CRON] Hora inválida ('${configuredTime}') para ${userEmail}. Erro:`,
          e instanceof Error ? e.message : e,
        )
        results.push({ user: userEmail, status: "error_config", error: `Hora inválida: ${configuredTime}` })
        continue // Pula para o próximo usuário
      }

      // *** CORREÇÃO PRINCIPAL: Comparação EXATA de hora e minuto (considerando UTC) ***
      const isTimeToSend = configHour === currentHour && configMinute === currentMinute

      if (!isTimeToSend) {
        // Log apenas se quiser debugar todos os usuários
        // console.log(`[CRON] Horário não corresponde para ${userEmail} (Config UTC: ${configHour}:${configMinute} / Atual UTC: ${currentHour}:${currentMinute})`)
        continue // Pula para o próximo usuário
      }

      // Horário correspondeu, processar este usuário
      console.log(
        `[CRON] Horário CORRESPONDE para ${userEmail} (UTC ${configHour}:${configMinute}). Buscando aniversariantes...`,
      )

      try {
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth)

        if (birthdayContacts.length === 0) {
          console.log(`[CRON] Nenhum aniversariante hoje para ${userEmail}.`)
          continue
        }

        console.log(
          `[CRON] ${birthdayContacts.length} aniversariantes para ${userEmail}: ${birthdayContacts.map((c) => c.nome).join(", ")}. Buscando mensagens...`,
        )

        const birthdayMessages = await getBirthdayMessages(userEmail)

        if (birthdayMessages.length === 0) {
          console.log(`[CRON] Nenhuma mensagem de aniversário configurada para ${userEmail}.`)
          results.push({
            user: userEmail,
            status: "error_config",
            error: "Nenhuma mensagem de aniversário configurada",
          })
          continue
        }

        // Enviar para cada contato
        for (const contact of birthdayContacts) {
          totalMessagesAttempted++
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          const messageTemplate = birthdayMessages[randomIndex]

          // Chamar a função sendMessage centralizada
          const sendResult = await sendMessage({
            userEmail,
            contactId: contact.id, // Passando ID do contato do Firestore
            contactName: contact.nome,
            contactPhone: contact.telefone,
            message: messageTemplate, // Passando o template
            usePersonalization: true, // Habilita personalização como {nome}
            messageType: "birthday", // Tipo para deduplicação
            sessionName: userSettings?.sessionName, // Busca o nome da sessão salva nas configurações do usuário
          })

          if (sendResult.success) {
            if (!sendResult.duplicated) {
              // Conta apenas se não for duplicado
              totalMessagesSent++
              console.log(`[CRON] ✅ Mensagem enviada para ${contact.nome} (${userEmail}). ID: ${sendResult.messageId}`)
            } else {
              console.log(
                `[CRON] ⏭️ Mensagem para ${contact.nome} (${userEmail}) já enviada hoje (deduplicada). ID: ${sendResult.messageId}`,
              )
            }
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: sendResult.duplicated ? "duplicated" : "success",
              messageId: sendResult.messageId,
            })
          } else {
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "error_send",
              error: sendResult.message,
              messageId: sendResult.messageId,
            })
            console.error(
              `[CRON] ❌ Falha ao enviar para ${contact.nome} (${userEmail}): ${sendResult.message}. ID: ${sendResult.messageId}`,
            )
          }
          // Pequena pausa para não sobrecarregar a API WAHA (opcional, ajuste conforme necessário)
          // await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (userError) {
        console.error(`[CRON] Erro processando ${userEmail}:`, userError)
        results.push({
          user: userEmail,
          status: "error_user_processing",
          error: userError instanceof Error ? userError.message : String(userError),
        })
      }
    } // Fim do loop for users

    console.log(
      `[CRON] Verificação concluída. ${usersProcessed} usuários verificados. ${totalMessagesSent} mensagens novas enviadas (${totalMessagesAttempted} tentativas totais).`,
    )
    return NextResponse.json({
      success: true,
      timestamp: executionTime.toISOString(),
      checkedUsers: usersProcessed,
      messagesAttempted: totalMessagesAttempted,
      messagesSent: totalMessagesSent, // Mensagens realmente enviadas (não duplicadas)
      details: results,
    })
  } catch (error) {
    console.error("[CRON] Erro GERAL:", error)
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
