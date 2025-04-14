// utils/message-sender.ts - COMPREHENSIVE FIX
import { db } from "@/lib/firebase-config"
import { collection, query, where, getDocs, Timestamp, runTransaction, doc } from "firebase/firestore"
import { personalizeMessage } from "@/utils/message-utils"

interface SendMessageOptions {
  phoneNumber: string
  message: string
  sessionName: string
  contactId?: string
  contactName?: string
  userEmail: string
  usePersonalization?: boolean
  messageType?: string
  uniqueId?: string
}

interface SendMessageResult {
  success: boolean
  message: string
  duplicated?: boolean
  messageId?: string
  data?: any
  error?: string
}

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const functionStartTime = Date.now()
  console.log(`--- [sendMessage_LOG] Start processing at ${new Date(functionStartTime).toISOString()} ---`)
  console.log(
    `[sendMessage_LOG] Received options: ${JSON.stringify({ ...options, message: options.message.substring(0, 30) + "..." })}`,
  )

  const {
    phoneNumber,
    message,
    sessionName,
    contactId,
    contactName,
    userEmail,
    usePersonalization = true,
    messageType = "direct",
    uniqueId,
  } = options

  // Input Validation
  if (!phoneNumber || !message || !sessionName || !userEmail) {
    const errorMsg = `[sendMessage_LOG] ERROR: Missing required parameters. Phone: ${!!phoneNumber}, Msg: ${!!message}, Session: ${!!sessionName}, Email: ${!!userEmail}`
    console.error(errorMsg)
    return { success: false, message: "Parâmetros obrigatórios faltando (ver logs do servidor)." }
  }

  // IMPROVED: Generate a truly unique message ID that includes all necessary components
  const today = new Date().toISOString().split("T")[0] // Format YYYY-MM-DD
  const contactIdentifier = contactId || phoneNumber.replace(/\D/g, "")
  // Include userEmail to ensure uniqueness per user
  const messageId = uniqueId || `${messageType}_${userEmail}_${contactIdentifier}_${today}`

  console.log(`[sendMessage_LOG] Generated messageId: ${messageId}`)

  try {
    // ENHANCED: First check if this message has already been sent today (outside transaction for efficiency)
    const sentMessagesRef = collection(db, "sent_messages")
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const q = query(
      sentMessagesRef,
      where("messageId", "==", messageId),
      where("timestamp", ">=", Timestamp.fromDate(todayStart)),
      where("status", "in", ["sent", "sending"]),
    )

    const existingMessages = await getDocs(q)
    if (!existingMessages.empty) {
      console.log(
        `[sendMessage_LOG] Message already sent today. MessageId: ${messageId}, Count: ${existingMessages.size}`,
      )
      return {
        success: true,
        message: "Mensagem já enviada hoje para este contato (verificação prévia)",
        duplicated: true,
        messageId,
      }
    }

    // Firestore Transaction for Deduplication and Sending
    console.log(`[sendMessage_LOG] Starting Firestore transaction for messageId: ${messageId}`)
    const result = await runTransaction(db, async (transaction) => {
      const sentMessageDocRef = doc(db, "sent_messages", messageId)

      // Double-check for duplicate WITHIN transaction
      const docSnap = await transaction.get(sentMessageDocRef)
      if (docSnap.exists() && docSnap.data()?.status !== "failed") {
        console.warn(
          `[sendMessage_LOG] Transaction: Duplicate found (status: ${docSnap.data()?.status}) for ${messageId}. Aborting.`,
        )
        return {
          success: true,
          message: "Mensagem já enviada ou processando (detectado na transação)",
          duplicated: true,
          messageId,
        }
      }

      // Record message as 'sending'
      transaction.set(
        sentMessageDocRef,
        {
          messageId,
          phoneNumber,
          contactId,
          contactName,
          userEmail,
          message: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
          timestamp: Timestamp.now(),
          status: "sending",
          type: messageType,
          sessionName: sessionName,
          lastAttemptAt: Timestamp.now(),
        },
        { merge: true },
      )

      // Personalize Message
      let finalMessage = message
      if (usePersonalization && contactName) {
        console.log(`[sendMessage_LOG] Transaction: Personalizing message for: ${contactName}`)
        finalMessage = personalizeMessage(message, contactName, true)
        console.log(`[sendMessage_LOG] Transaction: Personalized message: "${finalMessage.substring(0, 50)}..."`)
      }

      // Format Phone Number (chatId)
      let chatId = phoneNumber.replace(/\D/g, "")
      if (!chatId.endsWith("@c.us")) {
        chatId = `${chatId}@c.us`
      }

      // Prepare WAHA Request
      const wahaApiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com"
      const wahaApiKey = process.env.WAHA_API_KEY
      if (!wahaApiKey) throw new Error("WAHA_API_KEY environment variable not set!")

      const wahaEndpoint = `${wahaApiUrl}/api/sendText`
      const requestBody = { chatId, text: finalMessage, session: sessionName }
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": wahaApiKey,
      }

      // Call WAHA API
      console.log(`[sendMessage_LOG] Transaction: Calling WAHA API...`)
      let responseStatus = 0
      let responseText = ""
      let responseData = {}

      try {
        const response = await fetch(wahaEndpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestBody),
        })

        responseStatus = response.status
        responseText = await response.text()

        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          responseData = { raw: responseText }
        }

        console.log(`[sendMessage_LOG] Transaction: WAHA API Response Status: ${responseStatus}`)
      } catch (fetchError) {
        console.error(`[sendMessage_LOG] Transaction: Network Error calling WAHA API for ${messageId}:`, fetchError)

        transaction.update(sentMessageDocRef, {
          status: "failed",
          error: `Network Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          updatedAt: Timestamp.now(),
        })

        throw fetchError // Rollback transaction
      }

      // Handle WAHA Response
      if (responseStatus < 200 || responseStatus >= 300) {
        console.error(
          `[sendMessage_LOG] Transaction: WAHA API Error (${responseStatus}) for ${messageId}. Updating status to 'failed'.`,
        )

        transaction.update(sentMessageDocRef, {
          status: "failed",
          error: responseText.substring(0, 500),
          wahaStatus: responseStatus,
          updatedAt: Timestamp.now(),
        })

        return {
          success: false,
          message: `Erro da API WAHA (${responseStatus})`,
          error: responseText.substring(0, 500),
          messageId,
        }
      } else {
        console.log(
          `[sendMessage_LOG] Transaction: WAHA API Success (${responseStatus}) for ${messageId}. Updating status to 'sent'.`,
        )

        transaction.update(sentMessageDocRef, {
          status: "sent",
          response: responseData,
          wahaStatus: responseStatus,
          error: null,
          updatedAt: Timestamp.now(),
        })

        // Update Contact's Last Sent
        if (contactId && userEmail) {
          console.log(`[sendMessage_LOG] Transaction: Updating contact ${contactId} last message sent time.`)
          const contactRef = doc(db, `parabenspravoce/${userEmail}/users`, contactId)
          transaction.update(contactRef, {
            lastMessageSent: Timestamp.now(),
            lastMessageContent: finalMessage.substring(0, 100) + (finalMessage.length > 100 ? "..." : ""),
          })
        }

        return {
          success: true,
          message: "Mensagem enviada com sucesso",
          data: responseData,
          messageId,
        }
      }
    })

    // Handle results from transaction
    console.log(
      `[sendMessage_LOG] Firestore transaction completed. Result: ${JSON.stringify({
        success: result.success,
        message: result.message,
        duplicated: result.duplicated,
        messageId: result.messageId,
      })}`,
    )

    if (result && result.success) {
      if (result.duplicated) {
        console.log(`--- [sendMessage_LOG] Finished processing (DUPLICATE) in ${Date.now() - functionStartTime}ms ---`)
      } else {
        console.log(`--- [sendMessage_LOG] Finished processing (SUCCESS) in ${Date.now() - functionStartTime}ms ---`)
      }
    } else {
      console.log(`--- [sendMessage_LOG] Finished processing (FAILED) in ${Date.now() - functionStartTime}ms ---`)
    }

    return result as SendMessageResult
  } catch (error) {
    console.error(`[sendMessage_LOG] GENERAL ERROR for messageId ${messageId}:`, error)
    console.log(`--- [sendMessage_LOG] Finished processing (GENERAL ERROR) in ${Date.now() - functionStartTime}ms ---`)

    return {
      success: false,
      message: `Erro ao processar envio: ${error instanceof Error ? error.message : String(error)}`,
      messageId: messageId,
    }
  }
}

export async function sendAudioMessage(
  phoneNumber: string,
  audioUrl: string,
  sessionName: string,
  userEmail: string,
): Promise<SendMessageResult> {
  // Generate a unique ID for audio messages
  const today = new Date().toISOString().split("T")[0]
  const contactIdentifier = phoneNumber.replace(/\D/g, "")
  const messageId = `audio_${userEmail}_${contactIdentifier}_${today}`

  console.log(`[sendAudioMessage_LOG] Processing audio message with ID: ${messageId}`)

  // Check for duplicates first
  const sentMessagesRef = collection(db, "sent_messages")
  const q = query(
    sentMessagesRef,
    where("messageId", "==", messageId),
    where("timestamp", ">=", Timestamp.fromDate(new Date(today))),
    where("status", "in", ["sent", "sending"]),
  )

  const existingMessages = await getDocs(q)
  if (!existingMessages.empty) {
    console.log(`[sendAudioMessage_LOG] Audio message already sent today. MessageId: ${messageId}`)
    return {
      success: true,
      message: "Mensagem de áudio já enviada hoje para este contato",
      duplicated: true,
      messageId,
    }
  }

  // Implementation for sending audio messages would go here
  // For now, return a placeholder response
  return {
    success: false,
    message: "Funcionalidade de envio de áudio ainda não implementada completamente",
    messageId,
  }
}
