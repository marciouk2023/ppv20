import { db } from "@/lib/firebase-config"
import { collection, query, where, getDocs, addDoc, Timestamp, runTransaction, doc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { personalizeMessage } from "@/utils/message-utils"

/**
 * Interface for message sending options
 */
interface SendMessageOptions {
  phoneNumber: string
  message: string
  sessionName: string
  contactId?: string
  contactName?: string
  userEmail: string
  usePersonalization?: boolean
  messageType?: string
}

/**
 * Interface for message sending result
 */
interface SendMessageResult {
  success: boolean
  message: string
  duplicated?: boolean
  messageId?: string
  data?: any
}

/**
 * Sends a message to a WhatsApp number with deduplication
 * @param options Message sending options
 * @returns Promise with the result of the operation
 */
export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const {
    phoneNumber,
    message,
    sessionName,
    contactId,
    contactName,
    userEmail,
    usePersonalization = true,
    messageType = "direct",
  } = options

  if (!phoneNumber || !message || !sessionName || !userEmail) {
    return {
      success: false,
      message: "Parâmetros obrigatórios faltando: phoneNumber, message, sessionName, userEmail",
    }
  }

  try {
    // Generate a unique message ID for deduplication
    const messageId = `${messageType}_${userEmail}_${contactId || phoneNumber}_${new Date().toISOString().split("T")[0]}`

    // Check if this message has already been sent today (deduplication)
    const sentMessagesRef = collection(db, "sent_messages")
    const q = query(
      sentMessagesRef,
      where("messageId", "==", messageId),
      where("timestamp", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
    )

    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      console.log(`[MessageSender] Duplicate message detected with ID: ${messageId}. Skipping.`)
      return {
        success: true,
        message: "Mensagem já enviada hoje para este contato (deduplicada)",
        duplicated: true,
        messageId,
      }
    }

    // Personalize message if needed
    let finalMessage = message
    if (usePersonalization && contactName) {
      finalMessage = personalizeMessage(message, contactName, true)
    }

    // Clean phone number (remove non-digits)
    let chatId = phoneNumber.replace(/\D/g, "")

    // Ensure it has the @c.us suffix
    if (!chatId.endsWith("@c.us")) {
      chatId = `${chatId}@c.us`
    }

    // Prepare request body
    const requestBody = {
      chatId,
      text: finalMessage,
      session: sessionName,
    }

    // Get the WAHA API URL and key
    const wahaApiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com"
    const wahaApiKey = process.env.WAHA_API_KEY

    // Send message to WhatsApp
    console.log(`[MessageSender] Sending message to ${chatId} via session ${sessionName}`)

    // Use a transaction to ensure atomic operations
    const result = await runTransaction(db, async (transaction) => {
      // First, record this message as "sending" to prevent duplicates
      const sendingRef = doc(sentMessagesRef, messageId)
      transaction.set(sendingRef, {
        messageId,
        phoneNumber,
        contactId,
        contactName,
        userEmail,
        message: finalMessage.substring(0, 100) + (finalMessage.length > 100 ? "..." : ""),
        timestamp: Timestamp.now(),
        status: "sending",
      })

      // Now send the message
      const response = await fetch(`https://api.parabenspravoce.com/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Api-Key": wahaApiKey || "",
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      let responseData = {}

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = { raw: responseText }
      }

      if (!response.ok) {
        console.error(`[MessageSender] Error from WAHA API (${response.status}):`, responseText)

        // Update the message status to "failed"
        transaction.update(sendingRef, {
          status: "failed",
          error: responseText,
          updatedAt: Timestamp.now(),
        })

        return {
          success: false,
          message: `Erro da API WAHA (${response.status}): ${responseText}`,
          messageId,
        }
      }

      // Update the message status to "sent"
      transaction.update(sendingRef, {
        status: "sent",
        response: responseData,
        updatedAt: Timestamp.now(),
      })

      // If there's a contactId, update the contact's last message sent
      if (contactId && userEmail) {
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
    })

    console.log(`[MessageSender] Message sent successfully with ID: ${messageId}`)
    return result
  } catch (error) {
    console.error("[MessageSender] Error sending message:", error)
    return {
      success: false,
      message: `Erro ao enviar mensagem: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Sends an audio message to a WhatsApp number
 * @param phoneNumber Recipient's phone number
 * @param audioUrl URL of the audio file
 * @param sessionName WhatsApp session name
 * @param userEmail User's email
 * @returns Promise with the result of the operation
 */
export async function sendAudioMessage(
  phoneNumber: string,
  audioUrl: string,
  sessionName: string,
  userEmail: string,
): Promise<SendMessageResult> {
  if (!phoneNumber || !audioUrl || !sessionName || !userEmail) {
    return {
      success: false,
      message: "Parâmetros obrigatórios faltando: phoneNumber, audioUrl, sessionName, userEmail",
    }
  }

  try {
    // Generate a unique message ID for deduplication
    const messageId = `audio_${userEmail}_${phoneNumber}_${new Date().toISOString().split("T")[0]}_${uuidv4().substring(0, 8)}`

    // Check if this message has already been sent recently (deduplication)
    const sentMessagesRef = collection(db, "sent_messages")
    const q = query(
      sentMessagesRef,
      where("phoneNumber", "==", phoneNumber),
      where("type", "==", "audio"),
      where("timestamp", ">=", new Date(Date.now() - 30 * 60 * 1000)), // Last 30 minutes
    )

    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      console.log(`[MessageSender] Audio message already sent to ${phoneNumber} in the last 30 minutes. Skipping.`)
      return {
        success: true,
        message: "Mensagem de áudio já enviada recentemente para este contato (deduplicada)",
        duplicated: true,
      }
    }

    // Clean phone number (remove non-digits)
    let chatId = phoneNumber.replace(/\D/g, "")

    // Ensure it has the @c.us suffix
    if (!chatId.endsWith("@c.us")) {
      chatId = `${chatId}@c.us`
    }

    // Prepare request body
    const requestBody = {
      chatId,
      file: {
        mimetype: "audio/ogg; codecs=opus",
        url: audioUrl,
      },
      session: sessionName,
    }

    // Get the WAHA API URL and key
    const wahaApiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com"
    const wahaApiKey = process.env.WAHA_API_KEY

    // Record this message to prevent duplicates
    await addDoc(sentMessagesRef, {
      messageId,
      phoneNumber,
      userEmail,
      type: "audio",
      audioUrl,
      timestamp: Timestamp.now(),
      status: "sending",
    })

    // Send audio to WhatsApp
    console.log(`[MessageSender] Sending audio to ${chatId} via session ${sessionName}`)

    // Try sendVoice endpoint first
    const sendVoiceUrl = `https://api.parabenspravoce.com/api/sendVoice`
    const response = await fetch(sendVoiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": wahaApiKey || "",
      },
      body: JSON.stringify(requestBody),
    })

    if (response.ok) {
      const data = await response.json()

      // Update message status
      await addDoc(sentMessagesRef, {
        messageId,
        phoneNumber,
        userEmail,
        type: "audio",
        audioUrl,
        timestamp: Timestamp.now(),
        status: "sent",
        response: data,
      })

      return {
        success: true,
        message: "Mensagem de áudio enviada com sucesso",
        data,
        messageId,
      }
    }

    // If sendVoice fails, try sendAudio endpoint
    console.log(`[MessageSender] sendVoice failed, trying sendAudio...`)
    const sendAudioUrl = `https://api.parabenspravoce.com/api/sendAudio`
    const alternativeResponse = await fetch(sendAudioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": wahaApiKey || "",
      },
      body: JSON.stringify(requestBody),
    })

    if (alternativeResponse.ok) {
      const data = await alternativeResponse.json()

      // Update message status
      await addDoc(sentMessagesRef, {
        messageId,
        phoneNumber,
        userEmail,
        type: "audio",
        audioUrl,
        timestamp: Timestamp.now(),
        status: "sent",
        response: data,
      })

      return {
        success: true,
        message: "Mensagem de áudio enviada com sucesso (via sendAudio)",
        data,
        messageId,
      }
    }

    // Both endpoints failed
    const errorText = await alternativeResponse.text()
    console.error(`[MessageSender] Both sendVoice and sendAudio failed:`, errorText)

    // Update message status
    await addDoc(sentMessagesRef, {
      messageId,
      phoneNumber,
      userEmail,
      type: "audio",
      audioUrl,
      timestamp: Timestamp.now(),
      status: "failed",
      error: errorText,
    })

    return {
      success: false,
      message: `Erro ao enviar áudio: ${errorText}`,
      messageId,
    }
  } catch (error) {
    console.error("[MessageSender] Error sending audio message:", error)
    return {
      success: false,
      message: `Erro ao enviar mensagem de áudio: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
