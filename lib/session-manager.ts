import { db } from "@/lib/firebase-config"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

// Constants
const ADMIN_EMAIL = "ronaldo@graficaeleal.com.br"
const SESSION_COLLECTION = "whatsapp_sessions"

/**
 * Interface for session data stored in Firestore
 */
interface SessionData {
  sessionName: string
  userEmail: string
  createdAt: Date
  lastUsed: Date
  status: string
}

/**
 * Get the session data for a specific user
 * @param userEmail The email of the user
 * @returns The session data or null if not found
 */
export async function getUserSession(userEmail: string): Promise<{
  hasSession: boolean
  sessionName: string | null
  status: string | null
}> {
  if (!userEmail) {
    console.log("[SessionManager] No user email provided")
    return {
      hasSession: false,
      sessionName: null,
      status: null,
    }
  }

  try {
    console.log(`[SessionManager] Checking session for user: ${userEmail}`)

    // Check if the user has a session in Firestore
    const sessionDoc = await getDoc(doc(db, SESSION_COLLECTION, userEmail))

    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data() as SessionData
      console.log(`[SessionManager] Found session: ${sessionData.sessionName}, status: ${sessionData.status}`)

      // Update the lastUsed timestamp
      await updateDoc(doc(db, SESSION_COLLECTION, userEmail), {
        lastUsed: new Date(),
      })

      return {
        hasSession: true,
        sessionName: sessionData.sessionName,
        status: sessionData.status,
      }
    }

    // Special case for admin user
    if (userEmail === ADMIN_EMAIL) {
      console.log(`[SessionManager] Using default session for admin user: ${ADMIN_EMAIL}`)
      return {
        hasSession: true,
        sessionName: "default_admin_session",
        status: "CONNECTED",
      }
    }

    // Special case for marcioipro@gmail.com
    if (userEmail === "marcioipro@gmail.com") {
      console.log(`[SessionManager] Using default session for marcioipro@gmail.com`)
      return {
        hasSession: true,
        sessionName: "session_1744110392286_6039",
        status: "WORKING",
      }
    }

    console.log(`[SessionManager] No session found for user: ${userEmail}`)
    return {
      hasSession: false,
      sessionName: null,
      status: null,
    }
  } catch (error) {
    console.error("[SessionManager] Error getting user session:", error)
    return {
      hasSession: false,
      sessionName: null,
      status: null,
    }
  }
}

/**
 * Save a new session for a user
 * @param userEmail The email of the user
 * @param sessionName The name of the session
 * @param status The initial status of the session
 * @returns True if successful, false otherwise
 */
export async function saveUserSession(userEmail: string, sessionName: string, status = "STARTING"): Promise<boolean> {
  if (!userEmail || !sessionName) {
    console.log("[SessionManager] Missing user email or session name")
    return false
  }

  try {
    console.log(`[SessionManager] Saving session for user: ${userEmail}, session: ${sessionName}, status: ${status}`)

    // Create or update the session document
    await setDoc(doc(db, SESSION_COLLECTION, userEmail), {
      sessionName,
      userEmail,
      createdAt: new Date(),
      lastUsed: new Date(),
      status,
    })

    return true
  } catch (error) {
    console.error("[SessionManager] Error saving user session:", error)
    return false
  }
}

/**
 * Update the status of a user's session
 * @param userEmail The email of the user
 * @param status The new status
 * @returns True if successful, false otherwise
 */
export async function updateSessionStatus(userEmail: string, status: string): Promise<boolean> {
  if (!userEmail) {
    console.log("[SessionManager] No user email provided")
    return false
  }

  try {
    console.log(`[SessionManager] Updating session status for user: ${userEmail}, new status: ${status}`)

    const sessionDoc = await getDoc(doc(db, SESSION_COLLECTION, userEmail))

    if (sessionDoc.exists()) {
      await updateDoc(doc(db, SESSION_COLLECTION, userEmail), {
        status,
        lastUsed: new Date(),
      })
      return true
    }

    console.log(`[SessionManager] No session found to update for user: ${userEmail}`)
    return false
  } catch (error) {
    console.error("[SessionManager] Error updating session status:", error)
    return false
  }
}

/**
 * Check if a user has a valid session
 * @param userEmail The email of the user
 * @returns Object containing session information
 */
export async function checkUserSession(userEmail: string): Promise<{
  hasSession: boolean
  sessionName: string | null
  status: string | null
}> {
  return await getUserSession(userEmail)
}

/**
 * Obter a URL correta para verificar o status de uma sessão
 * @param sessionName Nome da sessão
 * @returns URL completa para o endpoint de status
 */
export function getSessionStatusURL(sessionName: string): string {
  const baseURL = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "https://api.parabenspravoce.com"

  // Caminho correto: /api/sessions/[sessionName]/status
  return `${baseURL}/api/sessions/${sessionName}/status`
}
