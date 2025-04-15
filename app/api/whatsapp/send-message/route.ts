import { type NextRequest, NextResponse } from "next/server"
import { getWAHABaseURL } from "@/lib/wahaConfig"
import { getUserSession } from "@/lib/session-manager"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, message, userEmail } = body

    console.log(`[API] Processing message request: phone=${phoneNumber}, user=${userEmail}`)

    if (!phoneNumber || !message) {
      console.log("[API] Missing phone number or message")
      return NextResponse.json({ success: false, message: "Phone number and message are required" }, { status: 400 })
    }

    if (!userEmail) {
      console.log("[API] Missing user email")
      return NextResponse.json(
        { success: false, message: "User email is required to identify the session" },
        { status: 400 },
      )
    }

    // Get the user's session
    const sessionData = await getUserSession(userEmail)
    console.log(`[API] Session data for ${userEmail}:`, sessionData)

    if (!sessionData || !sessionData.hasSession || !sessionData.sessionName) {
      console.log(`[API] No active session found for user: ${userEmail}`)
      return NextResponse.json(
        {
          success: false,
          message: "Conexão WhatsApp necessária",
          details: "Você precisa conectar seu WhatsApp na página de configurações antes de enviar mensagens.",
          code: "NO_SESSION",
        },
        { status: 400 },
      )
    }

    const sessionName = sessionData.sessionName

    // Format the phone number (remove spaces, dashes, etc.)
    const formattedPhone = phoneNumber.replace(/\D/g, "")

    // Get the base URL of the WAHA API - ensure it's the absolute URL
    const wahaBaseURL = getWAHABaseURL()
    console.log(`[API] Using WAHA API URL: ${wahaBaseURL}`)

    // Endpoint for sending message - use the complete absolute URL
    const sendMessageUrl = `${wahaBaseURL}/api/sendText`
    console.log(`[API] Full endpoint URL: ${sendMessageUrl}`)

    console.log(`[API] Sending message to ${formattedPhone} via session ${sessionName}`)

    // Make the request to the WAHA API
    const wahaResponse = await fetch(sendMessageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        chatId: `${formattedPhone}@c.us`,
        text: message,
        session: sessionName,
      }),
    })

    // Check if the response was successful
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(`[API] Error from WAHA API (${wahaResponse.status}):`, errorText)

      let errorMessage = `Error sending message: ${wahaResponse.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        errorMessage = errorText
      }

      return NextResponse.json({ success: false, message: errorMessage }, { status: wahaResponse.status })
    }

    // Process successful response
    const data = await wahaResponse.json()
    console.log(`[API] Message sent successfully:`, data)

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data,
    })
  } catch (error) {
    console.error("[API] Internal error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Error processing message send: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
