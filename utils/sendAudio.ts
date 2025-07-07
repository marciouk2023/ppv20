/**
 * Envia áudio para um número do WhatsApp usando a URL do Firebase
 * @param {string} phone - Número de telefone do destinatário
 * @param {string} audioUrl - URL do áudio no Firebase Storage
 * @param {string} sessionName - Nome da sessão WhatsApp (default por padrão)
 * @returns {Promise<any>} - Resultado da operação
 */
export async function sendAudioByUrl(phone: string, audioUrl: string, sessionName = "default"): Promise<any> {
  try {
    console.log(`[AudioRecorderDirect] Enviando áudio para ${phone} via sessão: ${sessionName}`)
    console.log(`[AudioRecorderDirect] Usando URL do Firebase:`, audioUrl)

    // Garantir que os dados estejam no formato correto
    const payload = {
      phone: phone.toString().trim(), // Converter para string e remover espaços
      audioUrl: audioUrl.toString().trim(), // Converter para string e remover espaços
      sessionName: sessionName.toString().trim(), // Converter para string e remover espaços
    }

    // Logging do payload para debug
    console.log("[AudioRecorderDirect] Payload:", JSON.stringify(payload))

    // Fazer a requisição para o endpoint
    const response = await fetch("/api/whatsapp/send-audio-direct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // Converter para JSON de forma segura
    })

    // Verificar se a resposta é válida
    const data = await response.json()

    if (!response.ok) {
      console.error(`[AudioRecorderDirect] Erro na resposta (${response.status}):`, data)
      // Extrair a mensagem de erro da resposta, que pode estar em diferentes formatos
      const errorMessage =
        data.error ||
        data.message ||
        (data.details && typeof data.details === "object" ? JSON.stringify(data.details) : data.details) ||
        `Erro ${response.status}`
      throw new Error(errorMessage)
    }

    // Processar resposta de sucesso
    console.log("[AudioRecorderDirect] Áudio enviado com sucesso:", data)
    return data
  } catch (error) {
    console.error("[AudioRecorderDirect] Erro ao enviar áudio:", error)
    throw error
  }
}
