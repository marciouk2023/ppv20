/**
 * Extrai o primeiro nome de um nome completo
 * @param fullName Nome completo do contato
 * @returns Primeiro nome do contato
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return ""
  return fullName.split(" ")[0]
}

/**
 * Personaliza uma mensagem substituindo a tag {nome} pelo primeiro nome do contato
 * @param message Mensagem original com possível tag {nome}
 * @param contactName Nome completo do contato
 * @param usePersonalization Flag que indica se a personalização está ativa
 * @returns Mensagem personalizada ou original
 */
export function personalizeMessage(message: string, contactName: string, usePersonalization: boolean): string {
  if (!usePersonalization || !message || !contactName) {
    return message
  }

  const firstName = extractFirstName(contactName)
  return message.replace(/\{nome\}/g, firstName)
}

/**
 * Gera exemplos de mensagens personalizadas para visualização
 * @param originalMessage Mensagem original
 * @param sampleName Nome de exemplo para personalização
 * @returns Objeto com mensagem original e personalizada
 */
export function generateMessageExample(
  originalMessage: string,
  sampleName = "Marcio",
): {
  original: string
  personalized: string
} {
  const withNameTag = originalMessage.includes("{nome}")
    ? originalMessage
    : `Feliz aniversário, {nome}! Que Deus abençoe sua vida.`

  return {
    original: withNameTag,
    personalized: personalizeMessage(withNameTag, sampleName, true),
  }
}
