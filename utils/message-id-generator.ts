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
  const dateStr = date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0]

  // Clean the contact identifier (remove non-alphanumeric characters if it's a phone number)
  const cleanIdentifier = contactIdentifier.replace(/\D/g, "")

  return `${messageType}_${userEmail}_${cleanIdentifier}_${dateStr}`
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
