// File: lib/wahaConfig.ts
// Centralizes the WAHA API configuration for use by the backend proxy

// Define the correct API URL with fallback
const apiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com"
// Ensure the URL is properly formatted with https:// prefix
const formattedApiUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`
const apiKey = process.env.WAHA_API_KEY || null

const WAHA_CONFIG = {
  // Always use the absolute URL
  API_URL: formattedApiUrl,
  API_KEY: apiKey,
}

// Function to get the base URL of the WAHA API
export function getWAHABaseURL(): string {
  if (!WAHA_CONFIG.API_URL) {
    console.error("CRITICAL ERROR: WAHA API URL is not defined in lib/wahaConfig.ts!")
    throw new Error("WAHA API URL is not defined in lib/wahaConfig.ts")
  }

  // Log the API URL being used for debugging
  console.log(`[wahaConfig] Using WAHA API URL: ${WAHA_CONFIG.API_URL}`)
  return WAHA_CONFIG.API_URL
}

export { WAHA_CONFIG }
