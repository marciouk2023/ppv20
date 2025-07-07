// app/api/cron/check-birthdays/route.ts - FIXED VERSION
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, Timestamp, doc, setDoc, runTransaction, getDoc } from "firebase/firestore"
import { personalizeMessage } from "@/utils/message-utils"

// Adicionar a nova função getUserExecutionLock após as importações
async function getUserExecutionLock(userEmail: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0]
    const lockId = `execution_${userEmail}_${today}`
    const lockRef = doc(db, "execution_locks", lockId)

    // Verificar se já existe um lock para hoje
    const lockDoc = await getDoc(lockRef)

    if (lockDoc.exists()) {
      const lastExecution = lockDoc.data().timestamp.toDate()
      const now = new Date()
      const hoursSinceLastExecution = (now.getTime() - lastExecution.getTime()) / (1000 * 60 * 60)

      // Se já foi executado nas últimas 23 horas, não execute novamente
      if (hoursSinceLastExecution < 23) {
        console.log(
          `[CRON_LOG] User ${userEmail} already processed today (${hoursSinceLastExecution.toFixed(2)} hours ago).`,
        )
        return false
      }
    }

    // Criar o lock para o dia
    await setDoc(lockRef, {
      timestamp: Timestamp.now(),
      userEmail,
      date: today,
    })

    return true
  } catch (error) {
    console.error(`[CRON_LOG] Error with execution lock:`, error)
    return true // Em caso de erro, permite executar
  }
}

// Substituir a função recordMessageSent
async function recordMessageSent(
  userEmail: string,
  contactId: string,
  contactName: string,
  phoneNumber: string,
  messageContent: string,
) {
  try {
    const today = new Date().toISOString().split("T")[0]
    const recordId = `birthday_${userEmail}_${contactId}_${today}`

    // Use setDoc com um ID específico de documento para evitar duplicatas
    await setDoc(doc(db, "sent_messages", recordId), {
      messageId: recordId,
      userEmail,
      contactId,
      contactName,
      phoneNumber,
      message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
      timestamp: Timestamp.now(),
      status: "sent",
      type: "birthday",
      sentBy: "cron",
    })

    return recordId
  } catch (error) {
    console.error(`[CRON_LOG] Error recording message sent:`, error)
    throw error
  }
}

// Function to get contacts with birthdays today
async function getUserBirthdayContacts(userEmail: string, currentDay: number, currentMonth: number) {
  const contactsRef = collection(db, `parabenspravoce/${userEmail}/users`)
  const snapshot = await getDocs(contactsRef)
  const birthdayContacts: Array<{ id: string; nome: string; telefone: string; data_de_nascimento: string }> = []

  snapshot.docs.forEach((doc) => {
    const contact = doc.data()
    if (!contact.data_de_nascimento || !contact.telefone) return

    let birthDay: number | undefined, birthMonth: number | undefined
    try {
      const dobString = String(contact.data_de_nascimento).trim()

      if (dobString.includes("/")) {
        const parts = dobString.split("/")
        if (parts.length >= 2) {
          birthDay = Number.parseInt(parts[0], 10)
          birthMonth = Number.parseInt(parts[1], 10)
        }
      } else if (dobString.includes("-")) {
        const parts = dobString.split("-")
        if (parts.length === 3) {
          birthMonth = Number.parseInt(parts[1], 10)
          birthDay = Number.parseInt(parts[2], 10)
        } else if (parts.length === 2) {
          birthMonth = Number.parseInt(parts[0], 10)
          birthDay = Number.parseInt(parts[1], 10)
        }
      }

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
        `[CRON_LOG] Error processing date '${contact.data_de_nascimento}' for contact ${doc.id} of user ${userEmail}:`,
        e instanceof Error ? e.message : e,
      )
    }
  })

  return birthdayContacts
}

// Function to get birthday messages from the messages collection
async function getBirthdayMessages(userEmail: string): Promise<string[]> {
  try {
    console.log(`[CRON_LOG] Fetching birthday messages from /messages collection for ${userEmail}`)

    // IMPORTANT: Only fetch from the messages collection (from /mensagens page)
    const messagesRef = collection(db, `parabenspravoce/${userEmail}/messages`)

    // Get all messages from the collection - no filtering by type to ensure we get all messages
    const snapshot = await getDocs(messagesRef)

    if (snapshot.empty) {
      console.log(`[CRON_LOG] No messages found in /messages collection for ${userEmail}`)
      return []
    }

    // Extract message content, checking multiple possible field names
    const messages = snapshot.docs
      .map((doc) => {
        // Check all possible field names where message content might be stored
        return doc.data().content || doc.data().conteudo || doc.data().message || ""
      })
      .filter((msg): msg is string => typeof msg === "string" && msg.trim() !== "")

    console.log(`[CRON_LOG] Found ${messages.length} messages in /messages collection for ${userEmail}`)

    return messages
  } catch (error) {
    console.error(`[CRON_LOG] Error fetching messages from /messages collection for ${userEmail}:`, error)
    return []
  }
}

// Check if a message was already sent to a contact today - UPDATED VERSION
async function wasMessageSentToContactToday(userEmail: string, contactId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0]
    const messageId = `birthday_${userEmail}_${contactId}_${today}`

    // Verificar diretamente se o documento existe com este ID específico
    const messageDocRef = doc(db, "sent_messages", messageId)
    const docSnap = await getDoc(messageDocRef)

    return docSnap.exists()
  } catch (error) {
    console.error(`[CRON_LOG] Error checking if message was sent to contact today:`, error)
    return false // Assume não foi enviado em caso de erro
  }
}

// NEW FUNCTION: Check and record message in a single atomic transaction
async function checkAndRecordMessage(
  userEmail: string,
  contactId: string,
  contactName: string,
  phoneNumber: string,
  messageContent: string,
): Promise<{ success: boolean; messageId?: string }> {
  const today = new Date().toISOString().split("T")[0]
  const messageId = `birthday_${userEmail}_${contactId}_${today}`
  const messageDocRef = doc(db, "sent_messages", messageId)

  try {
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(messageDocRef)

      if (docSnap.exists()) {
        // Já existe uma mensagem enviada hoje
        return { success: false, reason: "already_exists" }
      }

      // Documento não existe, podemos criar
      transaction.set(messageDocRef, {
        messageId,
        userEmail,
        contactId,
        contactName,
        phoneNumber,
        message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
        timestamp: Timestamp.now(),
        status: "sending", // Inicialmente marcamos como "sending"
        type: "birthday",
        sentBy: "cron",
      })

      return { success: true, messageId }
    })

    return result
  } catch (error) {
    console.error(`[CRON_LOG] Error in checkAndRecordMessage:`, error)
    return { success: false, reason: "transaction_error" }
  }
}

// Update message status after sending
async function updateMessageStatus(messageId: string, status: string, error?: string): Promise<void> {
  try {
    const messageDocRef = doc(db, "sent_messages", messageId)

    const updateData: Record<string, any> = {
      status,
      updatedAt: Timestamp.now(),
    }

    if (error) {
      updateData.error = error
    }

    await setDoc(messageDocRef, updateData, { merge: true })
  } catch (error) {
    console.error(`[CRON_LOG] Error updating message status:`, error)
  }
}

// Simple function to send a message (simplified version for this fix)
async function sendMessage(options: {
  phoneNumber: string
  message: string
  sessionName: string
  contactId: string
  contactName: string
  userEmail: string
  messageId: string
  executionId: string
}) {
  const { phoneNumber, message, sessionName, contactId, contactName, userEmail, messageId, executionId } = options

  try {
    // Personalize message if needed
    const finalMessage = contactName ? personalizeMessage(message, contactName, true) : message

    // Format phone number
    let chatId = phoneNumber.replace(/\D/g, "")
    if (!chatId.endsWith("@c.us")) {
      chatId = `${chatId}@c.us`
    }

    console.log(`[CRON_LOG][${executionId}] Sending message to ${contactName} (${phoneNumber})`)

    // Call WhatsApp API
    const wahaApiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com"
    const wahaApiKey = process.env.WAHA_API_KEY

    if (!wahaApiKey) {
      throw new Error("WAHA_API_KEY environment variable not set")
    }

    const response = await fetch(`${wahaApiUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": wahaApiKey,
      },
      body: JSON.stringify({
        chatId,
        text: finalMessage,
        session: sessionName,
      }),
    })

    if (!response.ok) {
      await updateMessageStatus(messageId, "failed", `WhatsApp API error: ${response.status}`)
      throw new Error(`WhatsApp API error: ${response.status}`)
    }

    // Update message status to sent
    await updateMessageStatus(messageId, "sent")

    return {
      success: true,
      message: "Message sent successfully",
      messageId,
    }
  } catch (error) {
    console.error(`[CRON_LOG][${executionId}] Error sending message:`, error)

    // Ensure we update the status even if there's an error
    try {
      await updateMessageStatus(messageId, "failed", error instanceof Error ? error.message : String(error))
    } catch (statusError) {
      console.error(`[CRON_LOG][${executionId}] Failed to update message status:`, statusError)
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// Function to acquire a lock for a specific user and contact
async function acquireLock(userEmail: string, contactId: string, executionId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split("T")[0]
    const lockId = `lock_${userEmail}_${contactId}_${today}`
    const lockRef = doc(db, "message_locks", lockId)

    console.log(`[CRON_LOG][${executionId}] Attempting to acquire lock: ${lockId}`)

    // Tente criar o documento de bloqueio com uma expiração
    const now = new Date()
    const expiration = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutos

    // Usar uma transação para garantir atomicidade
    return await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef)

      if (lockDoc.exists()) {
        // Verifique se o bloqueio expirou
        const data = lockDoc.data()
        const lockExpiration = data.expiration.toDate()
        if (now > lockExpiration) {
          // Bloqueio expirado, podemos adquiri-lo
          console.log(`[CRON_LOG][${executionId}] Lock expired, acquiring: ${lockId}`)
          transaction.set(lockRef, {
            acquired: true,
            timestamp: Timestamp.now(),
            expiration: Timestamp.fromDate(expiration),
            executionId,
          })
          return true
        }
        console.log(`[CRON_LOG][${executionId}] Lock already exists and is valid: ${lockId}`)
        return false // Bloqueio ainda válido
      }

      // Documento não existe, podemos criar
      console.log(`[CRON_LOG][${executionId}] Creating new lock: ${lockId}`)
      transaction.set(lockRef, {
        acquired: true,
        timestamp: Timestamp.now(),
        expiration: Timestamp.fromDate(expiration),
        executionId,
      })
      return true
    })
  } catch (error) {
    console.error(`[CRON_LOG][${executionId}] Error acquiring lock:`, error)
    return false
  }
}

// Função para verificar se o horário atual está dentro da janela permitida
function isWithinTimeWindow(
  configHour: number,
  configMinute: number,
  currentHour: number,
  currentMinute: number,
): boolean {
  // Converte horas e minutos para minutos totais para facilitar a comparação
  const configTotalMinutes = configHour * 60 + configMinute
  const currentTotalMinutes = currentHour * 60 + currentMinute

  // Janela de tempo de 5 minutos
  // Verifica se o tempo atual está dentro de uma janela de 5 minutos a partir do tempo configurado
  return Math.abs(currentTotalMinutes - configTotalMinutes) <= 5
}

export async function GET(request: Request) {
  // Generate a unique execution ID
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const executionTime = new Date()

  console.log("==============================================")
  console.log(`[CRON_LOG] Starting execution ${executionId} at ${executionTime.toISOString()}`)
  console.log("[CRON_LOG] GET request received for check-birthdays")

  // Security Check
  const authHeader = request.headers.get("Authorization")
  const expectedSecretValue = process.env.CRON_SECRET

  if (!expectedSecretValue) {
    console.error(`[CRON_LOG][${executionId}] CRON_SECRET missing!`)
    return NextResponse.json({ success: false, error: "Config missing" }, { status: 500 })
  }

  const expectedAuth = `Bearer ${expectedSecretValue}`
  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const isValidAuth = authHeader === expectedAuth

  if (!isVercelCron && !isValidAuth) {
    console.warn(`[CRON_LOG][${executionId}] Unauthorized access attempt. Header: ${authHeader}`)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const authMethod = isVercelCron ? "Vercel Cron" : "Header Authorization"
  console.log(`[CRON_LOG][${executionId}] Auth OK (${authMethod}). Starting check...`)

  // Time Calculation
  const currentHour = executionTime.getUTCHours()
  const currentMinute = executionTime.getUTCMinutes()
  const currentDay = executionTime.getUTCDate()
  const currentMonth = executionTime.getUTCMonth() + 1

  console.log(
    `[CRON_LOG][${executionId}] Current UTC Time: ${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}. Date: ${currentDay}/${currentMonth}`,
  )

  const results: Array<{ user: string; contact?: string; status: string; error?: string; messageId?: string }> = []
  let totalMessagesAttempted = 0
  let totalMessagesSent = 0
  let usersProcessed = 0

  try {
    console.log(`[CRON_LOG][${executionId}] Fetching user settings...`)
    const userSettingsCollection = collection(db, "user_settings")
    const userSettingsSnapshot = await getDocs(userSettingsCollection)
    console.log(`[CRON_LOG][${executionId}] Found ${userSettingsSnapshot.docs.length} user settings documents.`)

    for (const userDoc of userSettingsSnapshot.docs) {
      usersProcessed++
      const userEmail = userDoc.id
      const userSettings = userDoc.data()
      const configuredTime = userSettings?.sendTime ?? "08:00"
      const sessionName = userSettings?.sessionName || "default"

      // Adicionar log para início do processamento de cada usuário
      console.log(`[CRON_LOG][${executionId}] === STARTING PROCESSING FOR USER: ${userEmail} ===`)
      console.log(
        `\n[CRON_LOG][${executionId}] Processing User ${usersProcessed}: ${userEmail}. Configured time: ${configuredTime}, SessionName: ${sessionName}`,
      )

      let configHour = 8
      let configMinute = 0

      try {
        if (typeof configuredTime === "string" && configuredTime.includes(":")) {
          const timeParts = configuredTime.split(":")
          configHour = Number.parseInt(timeParts[0], 10)
          configMinute = Number.parseInt(timeParts[1], 10)

          if (isNaN(configHour) || isNaN(configMinute)) {
            throw new Error("Hour/Minute are not numbers")
          }
        }
      } catch (e) {
        console.error(
          `[CRON_LOG][${executionId}] Invalid time ('${configuredTime}') for ${userEmail}. Error:`,
          e instanceof Error ? e.message : e,
        )
        results.push({ user: userEmail, status: "error_config", error: `Invalid time: ${configuredTime}` })
        continue
      }

      // MODIFIED: Verificar se o horário atual está dentro da janela de tempo permitida
      const isTimeToSend = isWithinTimeWindow(configHour, configMinute, currentHour, currentMinute)

      console.log(
        `[CRON_LOG][${executionId}] Time Check for ${userEmail}: (Config: ${configHour}:${configMinute} vs Current UTC: ${currentHour}:${currentMinute}) -> isTimeToSend: ${isTimeToSend}`,
      )

      if (!isTimeToSend) {
        // Adicionar log de fim de processamento para este usuário
        console.log(`[CRON_LOG][${executionId}] === FINISHED PROCESSING FOR USER: ${userEmail} - Time not matched ===`)
        continue // Skip user if time doesn't match
      }

      console.log(`[CRON_LOG][${executionId}] TIME MATCH for ${userEmail}! Fetching contacts...`)

      // Verificar se esse usuário já foi processado hoje
      const canExecute = await getUserExecutionLock(userEmail)
      if (!canExecute) {
        console.log(`[CRON_LOG][${executionId}] Skipping user ${userEmail} - already processed today.`)
        results.push({
          user: userEmail,
          status: "skipped_already_processed",
        })

        // Adicionar log de fim de processamento para este usuário
        console.log(
          `[CRON_LOG][${executionId}] === FINISHED PROCESSING FOR USER: ${userEmail} - Already processed today ===`,
        )
        continue // Pular para o próximo usuário
      }

      try {
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth)
        console.log(`[CRON_LOG][${executionId}] Found ${birthdayContacts.length} birthday contacts for ${userEmail}.`)

        if (birthdayContacts.length === 0) {
          // Adicionar log de fim de processamento para este usuário
          console.log(
            `[CRON_LOG][${executionId}] === FINISHED PROCESSING FOR USER: ${userEmail} - No birthday contacts ===`,
          )
          continue
        }

        console.log(`[CRON_LOG][${executionId}] Fetching messages for ${userEmail}...`)
        const birthdayMessages = await getBirthdayMessages(userEmail)
        console.log(`[CRON_LOG][${executionId}] Found ${birthdayMessages.length} message templates for ${userEmail}.`)

        if (birthdayMessages.length === 0) {
          results.push({ user: userEmail, status: "error_config", error: "No birthday messages configured" })
          // Adicionar log de fim de processamento para este usuário
          console.log(
            `[CRON_LOG][${executionId}] === FINISHED PROCESSING FOR USER: ${userEmail} - No messages configured ===`,
          )
          continue
        }

        // Send to each contact
        for (const contact of birthdayContacts) {
          totalMessagesAttempted++

          // NEW CODE: Try to acquire a lock before sending
          const lockAcquired = await acquireLock(userEmail, contact.id, executionId)
          if (!lockAcquired) {
            console.log(
              `[CRON_LOG][${executionId}] 🔒 Could not acquire lock for ${contact.nome} (${userEmail}). Likely being processed by another instance.`,
            )
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "skipped_locked",
            })
            continue // Skip to next contact
          }

          // Select only ONE random message template
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          const messageTemplate = birthdayMessages[randomIndex]

          // Personalize message
          const personalizedMessage = personalizeMessage(messageTemplate, contact.nome, true)

          // UPDATED: Use transaction to check and record message
          const transactionResult = await checkAndRecordMessage(
            userEmail,
            contact.id,
            contact.nome,
            contact.telefone,
            personalizedMessage,
          )

          if (!transactionResult.success) {
            console.log(
              `[CRON_LOG][${executionId}] ⏭️ Message for ${contact.nome} (${userEmail}) already recorded or error in transaction. Skipping.`,
            )
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "skipped_transaction",
            })
            continue // Skip to next contact
          }

          // Call the sendMessage function only if transaction was successful
          const sendResult = await sendMessage({
            phoneNumber: contact.telefone,
            message: messageTemplate,
            sessionName: sessionName,
            contactId: contact.id,
            contactName: contact.nome,
            userEmail: userEmail,
            messageId: transactionResult.messageId!,
            executionId: executionId,
          })

          if (sendResult.success) {
            totalMessagesSent++
            console.log(`[CRON_LOG][${executionId}] ✅ Message sent to ${contact.nome} (${userEmail}).`)

            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "success",
              messageId: transactionResult.messageId,
            })
          } else {
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "error_send",
              error: sendResult.message,
            })

            console.error(
              `[CRON_LOG][${executionId}] ❌ Failed to send to ${contact.nome} (${userEmail}): ${sendResult.message}.`,
            )
          }
        } // End contact loop
      } catch (userError) {
        console.error(`[CRON_LOG][${executionId}] Error processing user ${userEmail} after time match:`, userError)
        results.push({
          user: userEmail,
          status: "error_user_processing",
          error: userError instanceof Error ? userError.message : String(userError),
        })
      }

      // Adicionar log de fim de processamento para este usuário
      console.log(`[CRON_LOG][${executionId}] === FINISHED PROCESSING FOR USER: ${userEmail} ===`)
    } // End user loop mesmo

    console.log(
      `[CRON_LOG][${executionId}] Check finished. Processed: ${usersProcessed}. Attempted: ${totalMessagesAttempted}. Sent New: ${totalMessagesSent}.`,
    )
    console.log(`[CRON_LOG] Completed execution ${executionId}`)
    console.log("==============================================")

    return NextResponse.json({
      success: true,
      executionId: executionId,
      timestamp: executionTime.toISOString(),
      checkedUsers: usersProcessed,
      messagesAttempted: totalMessagesAttempted,
      messagesSent: totalMessagesSent,
      details: results,
    })
  } catch (error) {
    console.error(`[CRON_LOG][${executionId}] GENERAL CRON ERROR:`, error)
    console.log(`[CRON_LOG] Completed execution ${executionId} with errors`)
    console.log("==============================================")

    return NextResponse.json(
      {
        success: false,
        executionId: executionId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: executionTime.toISOString(),
      },
      { status: 500 },
    )
  }
}
