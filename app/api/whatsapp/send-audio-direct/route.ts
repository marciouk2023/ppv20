import { type NextRequest, NextResponse } from "next/server"
import { getUserSession } from "@/lib/session-manager"
import { getWAHABaseURL } from "@/lib/wahaConfig"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, audioUrl, userEmail, mimeType } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 })
    }

    if (!audioUrl) {
      return NextResponse.json({ success: false, message: "Audio URL is required" }, { status: 400 })
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "User email is required to identify the session" },
        { status: 400 },
      )
    }

    // Get the user's session
    const sessionData = await getUserSession(userEmail)
    if (!sessionData || !sessionData.sessionName) {
      return NextResponse.json(
        { success: false, message: "No active WhatsApp session found for this user" },
        { status: 404 },
      )
    }

    const sessionName = sessionData.sessionName

    // Format the phone number for WhatsApp
    const formattedNumber = phoneNumber.includes("@c.us") ? phoneNumber : `${phoneNumber}@c.us`

    // Configure data for the WAHA API
    const wahaData = {
      chatId: formattedNumber,
      file: {
        mimetype: mimeType || "audio/ogg; codecs=opus",
        url: audioUrl,
      },
      caption: "",
      reply_to: null,
      session: sessionName,
    }

    console.log("[API] Sending audio to WhatsApp:", {
      phoneNumber: formattedNumber,
      audioUrl,
      mimeType: mimeType || "audio/ogg; codecs=opus",
      session: sessionName,
    })

    // Get the base URL of the WAHA API - ensure it's the absolute URL
    const wahaBaseUrl = getWAHABaseURL()
    const wahaApiKey = process.env.WAHA_API_KEY

    // Use the complete absolute URL
    const sendVoiceUrl = `${wahaBaseUrl}/api/sendVoice`
    console.log(`[API] Full endpoint URL: ${sendVoiceUrl}`)

    // Send the request to the WAHA API
    const wahaResponse = await fetch(sendVoiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": wahaApiKey || "",
      },
      body: JSON.stringify(wahaData),
    })

    // Try to read the response as text first for debug
    let responseText
    try {
      responseText = await wahaResponse.text()
      console.log(`Response from WAHA API (${wahaResponse.status}):`, responseText)
    } catch (e) {
      console.error("Error reading response as text:", e)
    }

    // Try to convert to JSON if possible
    let wahaResult
    try {
      wahaResult = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      console.warn("Response is not valid JSON:", responseText)
      wahaResult = { rawResponse: responseText }
    }

    if (!wahaResponse.ok) {
      console.error("Error in WAHA API:", wahaResult)

      // If failed with sendVoice, try with sendAudio
      console.log("[API] Trying alternative with sendAudio endpoint...")

      const sendAudioUrl = `${wahaBaseUrl}/api/sendAudio`
      console.log(`[API] Alternative endpoint URL: ${sendAudioUrl}`)

      const alternativeResponse = await fetch(sendAudioUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": wahaApiKey || "",
        },
        body: JSON.stringify(wahaData),
      })

      let alternativeText
      try {
        alternativeText = await alternativeResponse.text()
        console.log(`Response from alternative API (${alternativeResponse.status}):`, alternativeText)
      } catch (e) {
        console.error("Error reading alternative response as text:", e)
      }

      let alternativeResult
      try {
        alternativeResult = alternativeText ? JSON.parse(alternativeText) : {}
      } catch (e) {
        console.warn("Alternative response is not valid JSON:", alternativeText)
        alternativeResult = { rawResponse: alternativeText }
      }

      if (alternativeResponse.ok) {
        console.log("[API] Success with alternative sendAudio endpoint")
        return NextResponse.json({ success: true, data: alternativeResult })
      } else {
        console.error("Error also in sendAudio alternative:", alternativeResult)

        return NextResponse.json(
          {
            success: false,
            message: "Error sending audio via WAHA API",
            details: {
              sendVoice: wahaResult,
              sendAudio: alternativeResult,
            },
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true, data: wahaResult })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
