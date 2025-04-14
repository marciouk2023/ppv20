// app/api/cron/check-birthdays/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config" // Verifique se o caminho está correto
import { collection, getDocs, query, where } from "firebase/firestore"

// REMOVIDO: export const dynamic = "force_dynamic"; // Linha removida para evitar aviso

// Função auxiliar para buscar contatos (para organizar melhor)
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
        // Tenta assumir YYYY-MM-DD, mas pode precisar de ajuste se o formato for outro
        if (parts.length === 3) {
          birthMonth = Number.parseInt(parts[1], 10)
          birthDay = Number.parseInt(parts[2], 10)
        } else {
          // Se não for YYYY-MM-DD, talvez DD-MM-YYYY? Ajuste se necessário.
          // Exemplo para DD-MM-YYYY:
          // birthDay = Number.parseInt(parts[0], 10);
          // birthMonth = Number.parseInt(parts[1], 10);
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

// Função auxiliar para enviar mensagem (para organizar melhor)
async function sendWhatsAppMessage(
  apiUrl: string,
  contact: { id: string; nome: string; telefone: string; data_de_nascimento: string },
  message: string,
  userEmail: string,
) {
  console.log(`[CRON] Tentando enviar para ${contact.nome} (${contact.telefone}) do usuário ${userEmail}`)
  const response = await fetch(apiUrl, {
    // Usa a URL da API de envio
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Ajuste os nomes dos campos ('phoneNumber', 'message') se forem diferentes na sua API /api/whatsapp/send-message
      phoneNumber: contact.telefone,
      message: message,
      userEmail: userEmail, // Passa o email do usuário, se a API de envio precisar
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
    // Retorna um erro para que ele seja capturado e logado no results
    return { success: false, error: errorData.message || `Erro ${response.status}` }
  }

  const result = await response.json()
  console.log(`[CRON] ✅ Mensagem enviada com sucesso para ${contact.nome} (${userEmail}). Resposta API:`, result)
  return { success: true, result }
}

export async function GET(request: Request) {
  // Verificação de segurança usando o CRON_SECRET
  const authHeader = request.headers.get("Authorization")
  const expectedSecretValue = process.env.CRON_SECRET // Valor esperado da variável de ambiente
  const expectedAuth = `Bearer ${expectedSecretValue}`

  // Verifica se a requisição vem do Vercel Cron (que passa o segredo automaticamente)
  // ou se tem o header de autorização correto
  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const isValidAuth = authHeader === expectedAuth

  // --- NOVOS LOGS PARA DEBUG ---
  console.log(`[CRON DEBUG] Header 'Authorization' recebido: ${authHeader}`)
  console.log(`[CRON DEBUG] Valor esperado de process.env.CRON_SECRET: ${expectedSecretValue}`)
  console.log(`[CRON DEBUG] String 'expectedAuth' construída: ${expectedAuth}`)
  console.log(`[CRON DEBUG] Comparação 'authHeader === expectedAuth': ${isValidAuth}`)
  console.log(
    `[CRON DEBUG] Header 'x-vercel-cron': ${request.headers.get("x-vercel-cron")}, isVercelCron: ${isVercelCron}`,
  )
  // --- FIM DOS NOVOS LOGS ---

  if (!isVercelCron && !isValidAuth) {
    console.error("[CRON] Tentativa de acesso não autorizado (Falha na verificação!)")
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Ajuste no log de sucesso da autenticação
  if (isVercelCron) {
    console.log("[CRON] Autenticação OK (Vercel Cron). Iniciando verificação de aniversariantes...")
  } else {
    // Implicitamente, isValidAuth deve ser true aqui
    console.log("[CRON] Autenticação OK (Header Authorization). Iniciando verificação de aniversariantes...")
  }

  const executionTime = new Date()
  const currentHour = executionTime.getHours()
  const currentMinute = executionTime.getMinutes()
  const currentDay = executionTime.getDate()
  const currentMonth = executionTime.getMonth() + 1 // getMonth() é 0-11

  // URL da sua API de envio de mensagem (a que funciona manualmente)
  let sendMessageApiUrl: string
  try {
    // Tenta construir a URL relativa à requisição atual (funciona bem na Vercel)
    sendMessageApiUrl = new URL("/api/messages/send", request.url).toString()
  } catch (urlError) {
    // Se falhar (ex: rodando localmente sem contexto de URL completo), use uma URL absoluta fixa
    // !! IMPORTANTE: Substitua pela sua URL de deploy se necessário !!
    console.warn("[CRON] Falha ao construir URL relativa, usando URL absoluta fallback.")
    sendMessageApiUrl = process.env.NEXT_PUBLIC_BASE_URL // Tenta usar uma variável de ambiente
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/messages/send`
      : "https://v0-whatsapp-qr-code-bot-hoaqep.vercel.app/api/messages/send" // Fallback final para URL conhecida
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
      // Garante que userSettings e sendTime existem antes de acessar
      const configuredTime = userSettings && userSettings.sendTime ? userSettings.sendTime : "08:00" // Horário do usuário com fallback

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
        continue // Pula para o próximo usuário
      }

      // *** LÓGICA DE COMPARAÇÃO DE TEMPO AJUSTADA ***
      // Verifica se a hora configurada é a mesma hora atual E
      // se o minuto configurado está dentro do intervalo de 5 minutos que acabou de iniciar.
      const isTimeToSend =
        configHour === currentHour && configMinute >= currentMinute && configMinute < currentMinute + 5

      if (!isTimeToSend) {
        // Descomente se quiser logar CADA usuário que não bate o horário
        // console.log(`[CRON] Horário não bate para ${userEmail} (Config: ${configuredTime}, Atual: ${currentHour}:${String(currentMinute).padStart(2,'0')}). Pulando.`);
        continue // Não é a hora/minuto certo para este usuário, pula.
      }

      // Log apenas para usuários que CORRESPONDEM ao horário
      console.log(
        `[CRON] Horário CORRESPONDE para ${userEmail}! (Config: ${configuredTime} / Atual: ${currentHour}:${String(currentMinute).padStart(2, "0")}). Buscando aniversariantes...`,
      )

      try {
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth)

        if (birthdayContacts.length === 0) {
          console.log(`[CRON] Nenhum aniversariante encontrado hoje para ${userEmail}.`)
          continue
        }

        console.log(
          `[CRON] Encontrados ${birthdayContacts.length} aniversariantes para ${userEmail}: ${birthdayContacts.map((c) => c.nome).join(", ")}. Preparando envio...`,
        )

        // Pega mensagens do usuário ou usa padrão
        const birthdayMessages =
          userSettings && Array.isArray(userSettings.messages) && userSettings.messages.length > 0
            ? userSettings.messages
            : [
                "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
                "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
                "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
              ]

        for (const contact of birthdayContacts) {
          totalMessagesAttempted++

          // [Passo 1] Verificar se existe uma mensagem personalizada agendada na aba "Mensagens Agendadas".
          const campaignsRef = collection(db, `parabenspravoce/${userEmail}/campaigns`)
          const q = query(campaignsRef, where("contactId", "==", contact.id), where("status", "==", "scheduled"))
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            // Se SIM: Enviar apenas essa mensagem.
            const campaign = snapshot.docs[0].data()
            console.log(`[CRON] Encontrada mensagem personalizada para ${contact.nome}. Enviando...`)
            const sendResult = await sendWhatsAppMessage(sendMessageApiUrl, contact, campaign.message, userEmail)
            if (sendResult.success) {
              totalMessagesSent++
              results.push({ user: userEmail, contact: contact.nome, status: "success" })
            } else {
              results.push({
                user: userEmail,
                contact: contact.nome,
                status: "error",
                error: sendResult.error || "Erro desconhecido ao enviar mensagem personalizada",
              })
            }
          } else {
            // Se NÃO: Buscar uma mensagem aleatória e enviar apenas uma.
            const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
            let message = birthdayMessages[randomIndex]
            // Tenta pegar o primeiro nome, mas garante que não falhe se 'nome' for vazio
            const firstName = contact.nome && typeof contact.nome === "string" ? contact.nome.split(" ")[0] : "você"
            message = message.replace(/{nome}/g, firstName) // Substitui {nome}

            console.log(
              `[CRON] Nenhuma mensagem personalizada encontrada para ${contact.nome}. Enviando mensagem aleatória...`,
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
    } // Fim do loop de usuários

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
