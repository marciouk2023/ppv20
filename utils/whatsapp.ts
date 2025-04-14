/**
 * Sends audio to a WhatsApp number
 * @param {string} phone - Phone number (numbers only, no formatting)
 * @param {string} audioUrl - Audio file URL
 * @param {string} userEmail - User's email to identify their session
 * @returns {Promise<Object>} - API response
 */
export async function enviarAudio(phone: string, audioUrl: string, userEmail: string): Promise<any> {
  try {
    console.log(`[Frontend] Sending audio to ${phone} via user ${userEmail}`)

    const response = await fetch("/api/messages/send-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: phone,
        audioUrl: audioUrl,
        userEmail: userEmail,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[Frontend] Error sending audio (${response.status}):`, data)
      throw new Error(data.error || `Error ${response.status}`)
    }

    console.log(`[Frontend] Audio sent successfully:`, data)
    return data
  } catch (error) {
    console.error(`[Frontend] Error sending audio:`, error)
    throw error
  }
}

/**
 * Sends a text message to a WhatsApp number
 * @param {string} phone - Phone number (numbers only, no formatting)
 * @param {string} message - Message text
 * @param {string} userEmail - User's email to identify their session
 * @returns {Promise<Object>} - API response
 */
export async function enviarMensagem(phone: string, message: string, userEmail: string): Promise<any> {
  try {
    console.log(`[Frontend] Sending message to ${phone} via user ${userEmail}`)

    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: phone,
        message: message,
        userEmail: userEmail,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[Frontend] Error sending message (${response.status}):`, data)
      throw new Error(data.error || `Error ${response.status}`)
    }

    console.log(`[Frontend] Message sent successfully:`, data)
    return data
  } catch (error) {
    console.error(`[Frontend] Error sending message:`, error)
    throw error
  }
}
