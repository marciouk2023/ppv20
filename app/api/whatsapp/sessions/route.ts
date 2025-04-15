import { type NextRequest, NextResponse } from "next/server"
import { WAHA_CONFIG } from "@/lib/wahaConfig"

// Use the URL and Key imported from the configuration file
const WAHA_API_URL = WAHA_CONFIG.API_URL
const WAHA_API_KEY = WAHA_CONFIG.API_KEY

export async function POST(request: NextRequest) {
  // Check if the URL is defined in the configuration file
  if (!WAHA_API_URL) {
    console.error("[API Proxy /api/whatsapp/sessions] Error: WAHA API URL not defined in lib/wahaConfig.ts!")
    return NextResponse.json({ message: "Incomplete server configuration: WAHA API URL not defined." }, { status: 500 })
  }

  try {
    // Get data sent by the frontend (expecting a JSON with "sessionName" and "userEmail")
    const body = await request.json()
    const sessionName = body.sessionName
    const userEmail = body.userEmail

    // Validate if session name was sent
    if (!sessionName) {
      console.warn("[API Proxy /api/whatsapp/sessions] Request received without sessionName.")
      return NextResponse.json(
        { message: "Session name (sessionName) is required in the request body." },
        { status: 400 },
      )
    }

    console.log(
      `[API Proxy /api/whatsapp/sessions] Received request to create session: ${sessionName} for user: ${userEmail || "unknown"}`,
    )

    // Prepare headers for the WAHA API call
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    // Add authentication header if API key is defined
    if (WAHA_API_KEY) {
      headers["Authorization"] = `Bearer ${WAHA_API_KEY}`
      console.log(`[API Proxy /api/whatsapp/sessions] Sending request to WAHA with API key (from wahaConfig.ts).`)
    } else {
      console.log(`[API Proxy /api/whatsapp/sessions] Sending request to WAHA without API key.`)
    }

    // Prepare the request body for the WAHA API according to documentation
    const requestBody = {
      name: sessionName,
      start: true, // Try to start the session immediately
    }

    // Define the exact URL of the WAHA endpoint to create a session
    const wahaEndpoint = `${WAHA_API_URL}/api/sessions`
    console.log(`[API Proxy /api/whatsapp/sessions] Calling WAHA: POST ${wahaEndpoint}`)

    // Make the fetch call to the actual WAHA API
    const wahaResponse = await fetch(wahaEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    // Parse the WAHA API response
    if (wahaResponse.status === 422) {
      // Common status for "session already exists" or similar error
      console.log(
        `[API Proxy /api/whatsapp/sessions] WAHA responded 422 for '${sessionName}' (Session already exists or not processable).`,
      )
      // Return success to the frontend, as the session exists or the state is expected
      return NextResponse.json({
        success: true,
        message: "Session already exists or could not be processed (422)",
        userEmail: userEmail,
      })
    }

    if (wahaResponse.status === 201) {
      // Expected status for "Successfully created"
      const data = await wahaResponse.json()
      console.log(`[API Proxy /api/whatsapp/sessions] WAHA responded 201 for '${sessionName}' (Created successfully).`)
      return NextResponse.json({
        success: true,
        data: data,
        userEmail: userEmail,
      })
    }

    // If not 201 or 422, treat as error
    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error(
        `[API Proxy /api/whatsapp/sessions] Error from WAHA API (${wahaResponse.status}) for '${sessionName}':`,
        errorText,
      )

      // Try to return a clearer error message
      let errorMessage = `WAHA API Error (${wahaResponse.status})`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorText
      } catch (e) {
        // Keep original text if not JSON
        errorMessage = errorText
      }

      // Return the original error status from WAHA to the frontend
      return NextResponse.json({ message: errorMessage }, { status: wahaResponse.status })
    }

    // If response is OK but not 201 (unexpected)
    console.warn(
      `[API Proxy /api/whatsapp/sessions] Unexpected OK response from WAHA for '${sessionName}': Status ${wahaResponse.status}`,
    )

    // Try to return the response body anyway
    try {
      return NextResponse.json(await wahaResponse.json())
    } catch (e) {
      return NextResponse.json(
        { message: "Received unexpected OK status from WAHA API" },
        { status: wahaResponse.status },
      )
    }
  } catch (error) {
    console.error("[API Proxy /api/whatsapp/sessions] Internal route error:", error)
    // Return a generic 500 error to the frontend
    return NextResponse.json(
      {
        message: "Internal Server Error processing session creation.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Add a handler for GET to avoid errors if called incorrectly
export async function GET(request: NextRequest) {
  // Return 405 Method Not Allowed if someone tries to GET this endpoint
  console.log("[API Proxy /api/whatsapp/sessions] Received GET request (not allowed).")
  return NextResponse.json({ message: "GET method not allowed for this route. Use POST." }, { status: 405 })
}
