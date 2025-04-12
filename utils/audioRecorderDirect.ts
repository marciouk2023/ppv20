/**
 * Função para enviar áudio diretamente através da API
 * @param {string} phone - Número de telefone do destinatário
 * @param {string} audioData - URL ou dados do áudio
 * @param {string} sessionName - Nome da sessão (default por padrão)
 * @returns {Promise<any>} - Resultado da operação
 */
export async function enviarAudioDirect(phone: string, audioData: string, sessionName = "default"): Promise<any> {
  try {
    console.log(`[AudioRecorderDirect] Enviando áudio para ${phone} via sessão: ${sessionName}`)

    // Garantir que os dados estejam no formato correto
    const payload = {
      phone: phone.toString().trim(), // Converter para string e remover espaços
      audioUrl: audioData.toString().trim(), // Converter para string e remover espaços
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
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AudioRecorderDirect] Erro na resposta (${response.status}):`, errorText)

      try {
        // Tentar analisar como JSON, se possível
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || errorJson.message || `Erro ${response.status}`)
      } catch (jsonError) {
        // Se não for JSON válido, retornar o texto
        throw new Error(`Erro ${response.status}: ${errorText.substring(0, 100)}`)
      }
    }

    // Processar resposta de sucesso
    const data = await response.json()
    console.log("[AudioRecorderDirect] Áudio enviado com sucesso:", data)
    return data
  } catch (error) {
    console.error("[AudioRecorderDirect] Erro ao enviar áudio:", error)
    throw error
  }
}
