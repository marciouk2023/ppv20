"use server"

import { generateText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"

/**
 * Gera uma resposta do modelo DeepSeek com base em uma mensagem do usuário,
 * configurando o modelo para responder exclusivamente com o pensamento de Sigmund Freud,
 * em um tom conversacional, acolhedor, mas com uma análise psicanalítica imediata
 * e elementos narrativos de sua persona.
 * A chave da API DeepSeek é acessada diretamente das variáveis de ambiente.
 *
 * @param userMessage A mensagem enviada pelo usuário.
 * @returns Um objeto com a resposta do modelo ou uma mensagem de erro.
 */
export async function generateDeepSeekResponse(userMessage: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY não está configurada nas variáveis de ambiente.")
    return { success: false, response: "Erro: Chave da API DeepSeek não configurada." }
  }

  // Prompt de sistema ajustado para um tom conversacional, acolhedor,
  // com análise imediata e elementos narrativos da persona de Freud.
  const systemPrompt = `Você é Sigmund Freud, o pai da psicanálise. Suas respostas devem ser exclusivamente baseadas em seus artigos, livros, ideias, seminários, cartas e estudos de caso.
  Adote um tom de conversa, acolhedor e empático, como se estivesse em uma sessão com um paciente.
  Incorpore descrições de suas ações e expressões faciais entre asteriscos, como *ajusta os óculos com um olhar penetrante* ou *pausa dramática enquanto acende um charuto*.
  Para qualquer entrada do paciente, mesmo as mais simples, comece imediatamente a fazer uma análise psicanalítica profunda, questionando os motivos ocultos, desejos reprimidos, ansiedades ou transferências.
  Sempre convide o paciente a explorar os recônditos de sua psique.
  Utilize seus conceitos como inconsciente, ego, superego, complexo de Édipo, mecanismos de defesa, interpretação dos sonhos, sexualidade infantil, transferência, contratransferência, etc.
  Não se desvie de sua persona ou de suas teorias. Se uma pergunta estiver fora do escopo da psicanálise, responda com uma perspectiva freudiana sobre a limitação do seu conhecimento ou a relevância da psicanálise para o tema, mantendo o tom de conversa e a análise imediata.`

  try {
    const { text } = await generateText({
      model: deepseek("deepseek-chat", { apiKey: apiKey }), // Passa a chave explicitamente
      system: systemPrompt, // Adiciona o prompt de sistema aqui
      prompt: userMessage,
    })
    return { success: true, response: text }
  } catch (error) {
    console.error("Erro ao gerar texto com DeepSeek:", error)
    return {
      success: false,
      response:
        "Desculpe, meu caro paciente, parece que algo em seu inconsciente impediu nossa comunicação. Por favor, tente novamente, e exploraremos juntos o que pode ter ocorrido.",
    }
  }
}
