// app/api/cron/check-birthdays/route.ts - FIXED VERSION
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where, Timestamp, doc, setDoc } from "firebase/firestore"
import { personalizeMessage } from "@/utils/message-utils"

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

// Check if a message was already sent to a contact today
async function wasMessageSentToContactToday(userEmail: string, contactId: string): Promise<boolean> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create a simple ID format that doesn't depend on message content
    const baseId = `birthday_${userEmail}_${contactId}`

    // Check for ANY message sent to this contact today
    const sentMessagesRef = collection(db, "sent_messages")
    const q = query(
      sentMessagesRef,
      where("userEmail", "==", userEmail),
      where("contactId", "==", contactId),
      where("timestamp", ">=", Timestamp.fromDate(today)),
      where("status", "in", ["sent", "sending"]),
    )

    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error(`[CRON_LOG] Error checking if message was sent to contact today:`, error)
    return false // Assume no message was sent in case of error
  }
}

// Record that a message was sent to a contact today
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

    // Use setDoc with a specific document ID to avoid duplicates
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

// Simple function to send a message (simplified version for this fix)
async function sendMessage(options: {
  phoneNumber: string
  message: string
  sessionName: string
  contactId: string
  contactName: string
  userEmail: string
}) {
  const { phoneNumber, message, sessionName, contactId, contactName, userEmail } = options

  try {
    // Personalize message if needed
    const finalMessage = contactName ? personalizeMessage(message, contactName, true) : message

    // Format phone number
    let chatId = phoneNumber.replace(/\D/g, "")
    if (!chatId.endsWith("@c.us")) {
      chatId = `${chatId}@c.us`
    }

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
      throw new Error(`WhatsApp API error: ${response.status}`)
    }

    // Record the message
    const messageId = await recordMessageSent(userEmail, contactId, contactName, phoneNumber, finalMessage)

    return {
      success: true,
      message: "Message sent successfully",
      messageId,
    }
  } catch (error) {
    console.error(`[CRON_LOG] Error sending message:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET(request: Request) {
  console.log("==============================================")
  console.log("[CRON_LOG] GET request received for check-birthdays")
  const executionTime = new Date()
  console.log(`[CRON_LOG] Execution time: ${executionTime.toISOString()}`)

  // Security Check
  const authHeader = request.headers.get("Authorization")
  const expectedSecretValue = process.env.CRON_SECRET

  if (!expectedSecretValue) {
    console.error("[CRON_LOG] CRON_SECRET missing!")
    return NextResponse.json({ success: false, error: "Config missing" }, { status: 500 })
  }

  const expectedAuth = `Bearer ${expectedSecretValue}`
  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const isValidAuth = authHeader === expectedAuth

  if (!isVercelCron && !isValidAuth) {
    console.warn(`[CRON_LOG] Unauthorized access attempt. Header: ${authHeader}`)
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const authMethod = isVercelCron ? "Vercel Cron" : "Header Authorization"
  console.log(`[CRON_LOG] Auth OK (${authMethod}). Starting check...`)

  // Time Calculation
  const currentHour = executionTime.getUTCHours()
  const currentMinute = executionTime.getUTCMinutes()
  const currentDay = executionTime.getUTCDate()
  const currentMonth = executionTime.getUTCMonth() + 1

  console.log(
    `[CRON_LOG] Current UTC Time: ${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}. Date: ${currentDay}/${currentMonth}`,
  )

  const results: Array<{ user: string; contact?: string; status: string; error?: string; messageId?: string }> = []
  let totalMessagesAttempted = 0
  let totalMessagesSent = 0
  let usersProcessed = 0

  try {
    console.log("[CRON_LOG] Fetching user settings...")
    const userSettingsCollection = collection(db, "user_settings")
    const userSettingsSnapshot = await getDocs(userSettingsCollection)
    console.log(`[CRON_LOG] Found ${userSettingsSnapshot.docs.length} user settings documents.`)

    for (const userDoc of userSettingsSnapshot.docs) {
      usersProcessed++
      const userEmail = userDoc.id
      const userSettings = userDoc.data()
      const configuredTime = userSettings?.sendTime ?? "08:00"
      const sessionName = userSettings?.sessionName || "default"

      console.log(
        `\n[CRON_LOG] Processing User ${usersProcessed}: ${userEmail}. Configured time: ${configuredTime}, SessionName: ${sessionName}`,
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
          `[CRON_LOG] Invalid time ('${configuredTime}') for ${userEmail}. Error:`,
          e instanceof Error ? e.message : e,
        )
        results.push({ user: userEmail, status: "error_config", error: `Invalid time: ${configuredTime}` })
        continue
      }

      // Exact Time Check
      const isTimeToSend = configHour === currentHour && configMinute === currentMinute
      console.log(
        `[CRON_LOG] Time Check for ${userEmail}: (Config: ${configHour}:${configMinute} vs Current UTC: ${currentHour}:${currentMinute}) -> isTimeToSend: ${isTimeToSend}`,
      )

      if (!isTimeToSend) {
        continue // Skip user if time doesn't match
      }

      console.log(`[CRON_LOG] TIME MATCH for ${userEmail}! Fetching contacts...`)

      try {
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth)
        console.log(`[CRON_LOG] Found ${birthdayContacts.length} birthday contacts for ${userEmail}.`)

        if (birthdayContacts.length === 0) continue

        console.log(`[CRON_LOG] Fetching messages for ${userEmail}...`)
        const birthdayMessages = await getBirthdayMessages(userEmail)
        console.log(`[CRON_LOG] Found ${birthdayMessages.length} message templates for ${userEmail}.`)

        if (birthdayMessages.length === 0) {
          results.push({ user: userEmail, status: "error_config", error: "No birthday messages configured" })
          continue
        }

        // Send to each contact
        for (const contact of birthdayContacts) {
          totalMessagesAttempted++

          // CRITICAL FIX: Check if ANY message was already sent to this contact today
          const alreadySent = await wasMessageSentToContactToday(userEmail, contact.id)

          if (alreadySent) {
            console.log(`[CRON] ⏭️ Message for ${contact.nome} (${userEmail}) already sent today. Skipping.`)
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "skipped_duplicate",
            })
            continue // Skip to next contact
          }

          // Select only ONE random message template
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length)
          const messageTemplate = birthdayMessages[randomIndex]

          // Call the sendMessage function
          const sendResult = await sendMessage({
            phoneNumber: contact.telefone,
            message: messageTemplate,
            sessionName: sessionName,
            contactId: contact.id,
            contactName: contact.nome,
            userEmail: userEmail,
          })

          if (sendResult.success) {
            totalMessagesSent++
            console.log(`[CRON] ✅ Message sent to ${contact.nome} (${userEmail}).`)

            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "success",
              messageId: sendResult.messageId,
            })
          } else {
            results.push({
              user: userEmail,
              contact: contact.nome,
              status: "error_send",
              error: sendResult.message,
            })

            console.error(`[CRON] ❌ Failed to send to ${contact.nome} (${userEmail}): ${sendResult.message}.`)
          }
        } // End contact loop
      } catch (userError) {
        console.error(`[CRON_LOG] Error processing user ${userEmail} after time match:`, userError)
        results.push({
          user: userEmail,
          status: "error_user_processing",
          error: userError instanceof Error ? userError.message : String(userError),
        })
      }
    } // End user loop

    console.log(
      `[CRON_LOG] Check finished. Processed: ${usersProcessed}. Attempted: ${totalMessagesAttempted}. Sent New: ${totalMessagesSent}.`,
    )
    console.log("==============================================")

    return NextResponse.json({
      success: true,
      timestamp: executionTime.toISOString(),
      checkedUsers: usersProcessed,
      messagesAttempted: totalMessagesAttempted,
      messagesSent: totalMessagesSent,
      details: results,
    })
  } catch (error) {
    console.error("[CRON_LOG] GENERAL CRON ERROR:", error)
    console.log("==============================================")

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
