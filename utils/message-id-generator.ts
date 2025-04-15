/**
 * Utility to generate consistent message IDs across the application
 * This ensures that the same ID format is used everywhere for proper deduplication
 */

/**
 * Generates a unique message ID for deduplication
 * @param messageType Type of message (e.g., 'birthday', 'direct', 'audio')
 * @param userEmail User's email address
 * @param contactIdentifier Contact ID or phone number
 * @param date Optional date (defaults to today)
 * @returns A unique message ID string
 */
export function generateMessageId(
  messageType: string,
  userEmail: string,
  contactIdentifier: string,
  date?: Date,
): string {
  // Format: messageType_userEmail_contactIdentifier_YYYY-MM-DD
  // Use only the date part (without time) to ensure all messages on the same day have the same date component
  const today = date || new Date()
  const dateStr = today.toISOString().split("T")[0] // YYYY-MM-DD format

  // Clean the contact identifier (remove non-alphanumeric characters if it's a phone number)
  const cleanIdentifier =
    typeof contactIdentifier === "string" ? contactIdentifier.replace(/\D/g, "") : contactIdentifier

  // Clean the email (remove special characters)
  const cleanEmail = typeof userEmail === "string" ? userEmail.replace(/[^\w@.-]/g, "") : userEmail

  // Create a consistent ID format that doesn't depend on the message content
  return `${messageType}_${cleanEmail}_${cleanIdentifier}_${dateStr}`
}

/**
 * Checks if a message was already sent today
 * @param messageId The message ID to check
 * @returns True if the message was sent today, false otherwise
 */
export function isMessageFromToday(messageId: string): boolean {
  const today = new Date().toISOString().split("T")[0]
  return messageId.endsWith(today)
}
