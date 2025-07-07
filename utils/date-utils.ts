export function formatDateToBrazilian(dateString: string): string {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString

    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}

/**
 * Calculates the number of days until the next birthday.
 * @param dateString Date of birth in YYYY-MM-DD format.
 * @returns The number of days until the next birthday.
 */
export function daysUntilBirthday(dateString: string): number {
  if (!dateString) return 365

  try {
    const birthDate = new Date(dateString)
    const today = new Date()

    // Set the year of the birth date to the current year
    birthDate.setFullYear(today.getFullYear())

    // If the birthday has already passed this year, set the year to next year
    if (birthDate < today) {
      birthDate.setFullYear(today.getFullYear() + 1)
    }

    // Calculate the difference in milliseconds
    const diff = birthDate.getTime() - today.getTime()

    // Convert milliseconds to days
    const days = Math.ceil(diff / (1000 * 3600 * 24))

    return days
  } catch (error) {
    console.error("Error calculating days until birthday:", error)
    return 365 // Return a default value in case of error
  }
}

/**
 * Checks if a birthday is this month.
 * @param dateString Date of birth in YYYY-MM-DD format.
 * @returns True if the birthday is this month, false otherwise.
 */
export function isBirthdayThisMonth(dateString: string): boolean {
  if (!dateString) return false

  try {
    const birthDate = new Date(dateString)
    const today = new Date()

    return birthDate.getMonth() === today.getMonth()
  } catch (error) {
    console.error("Error checking if birthday is this month:", error)
    return false
  }
}
